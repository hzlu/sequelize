'use strict';

const AbstractQuery = require('../abstract/query');
const sequelizeErrors = require('../../errors');
const _ = require('lodash');
const { logger } = require('../../utils/logger');

const ER_DUP_ENTRY = 1062;
const ER_DEADLOCK = 1213;
const ER_ROW_IS_REFERENCED = 1451;
const ER_NO_REFERENCED_ROW = 1452;

const debug = logger.debugContext('sql:dmdb');

class Query extends AbstractQuery {
  constructor(connection, sequelize, options) {
    super(connection, sequelize, { showWarnings: false, ...options });
    this.maxRows = options.maxRows || 0;
    this.outFormat = options.outFormat || this.sequelize.connectionManager.lib.OUT_FORMAT_OBJECT;
    this.resultSet = options.resultSet === true ? true : false;
    this.extendedMetaData = options.extendedMetaData === true ? true : false;
  }

  getInsertIdField() {
    return '@@IDENTITY';
  }

  static formatBindParameters(sql, values, dialect) {
    const bindParam = [];
    const replacementFunc = (match, key, values_) => {
      if (values_[key] !== undefined) {
        bindParam.push(values_[key]);
        return '?';
      }
      return undefined;
    };
    sql = AbstractQuery.formatBindParameters(sql, values, dialect, replacementFunc)[0];
    return [sql, bindParam.length > 0 ? bindParam : undefined];
  }

  async run(sql, parameters) {
    this.sql = sql;
    const { connection, options } = this;

    const showWarnings = this.sequelize.options.showWarnings || options.showWarnings;

    const complete = this._logQuery(sql, debug, parameters);

    if (parameters) {
      debug('parameters(%j)', parameters);
    }

    let results;
    const errForStack = new Error();

    try {
      const execOptions = {
        extendedMetaData: this.extendedMetaData,
        outFormat: this.outFormat,
        resultSet: this.resultSet
      };
      if (parameters && parameters.length) {
        results = await new Promise((resolve, reject) => {
          connection
            .execute(sql, parameters, execOptions, (error, result) => error ? reject(error) : resolve(result));
        });
      } else {
        results = await new Promise((resolve, reject) => {
          connection
            .execute(sql, {}, execOptions, (error, result) => error ? reject(error) : resolve(result));
        });
      }
      if (this.isInsertQuery()) {
        const lastIdentityResults = await new Promise((resolve, reject) => {
          connection
            .execute(`SELECT ${this.getInsertIdField()};`, {}, execOptions, (error, result) => error ? reject(error) : resolve(result));
        });
        results[this.getInsertIdField()] = lastIdentityResults.rows[0][this.getInsertIdField()];
      }
    } catch (error) {
      if (options.transaction && error.errno === ER_DEADLOCK) {
        // MySQL automatically rolls-back transactions in the event of a deadlock.
        // However, we still initiate a manual rollback to ensure the connection gets released - see #13102.
        try {
          await options.transaction.rollback();
        } catch (error_) {
          // Ignore errors - since MySQL automatically rolled back, we're
          // not that worried about this redundant rollback failing.
        }

        options.transaction.finished = 'rollback';
      }

      error.sql = sql;
      error.parameters = parameters;
      throw this.formatError(error, errForStack.stack);
    } finally {
      complete();
    }

    if (showWarnings && results && results.warningStatus > 0) {
      await this.logWarnings(results);
    }
    return this.formatResults(results);
  }

  /**
   * High level function that handles the results of a query execution.
   *
   *
   * Example:
   *  query.formatResults([
   *    {
   *      id: 1,              // this is from the main table
   *      attr2: 'snafu',     // this is from the main table
   *      Tasks.id: 1,        // this is from the associated table
   *      Tasks.title: 'task' // this is from the associated table
   *    }
   *  ])
   *
   * @param {Array} data - The result of the query execution.
   * @private
   */
  formatResults(data) {
    let result = this.instance;

    if (this.isInsertQuery(data)) {
      this.handleInsertQuery(data);

      if (!this.instance) {
        // handle bulkCreate AI primary key
        if (
          data.constructor.name === 't'
          && this.model
          && this.model.autoIncrementAttribute
          && this.model.autoIncrementAttribute === this.model.primaryKeyAttribute
          && this.model.rawAttributes[this.model.primaryKeyAttribute]
        ) {
          const endId = data[this.getInsertIdField()];
          result = [];
          for (let i = endId; i > endId - data.rowsAffected; i--) {
            result.unshift({ [this.model.rawAttributes[this.model.primaryKeyAttribute].field]: i });
          }
        } else {
          result = data[this.getInsertIdField()];
        }
      }
    }

    if (this.isSelectQuery()) {
      const props = this.connection.props;
      if (props && props.innerProps && props.innerProps.get('supportbignumbers') && !props.innerProps.get('bignumberstrings') && data.rows) {
        if (this.outFormat === this.sequelize.connectionManager.lib.OUT_FORMAT_OBJECT) {
          data.rows.forEach(item => {
            for (const key in item) {
              if (Object.prototype.hasOwnProperty.call(item, key) && typeof item[key] === 'bigint') {
                item[key] = parseInt(item[key], 10);
              }
            }
          });
        } else {
          data.rows = data.rows.map(item => {
            return item.map(value => {
              if (typeof value === 'bigint') return parseInt(value, 10);
              return value;
            });
          });
        }
      }
      return this.handleSelectQuery(data.rows);
    }
    if (this.isShowTablesQuery()) {
      return this.handleShowTablesQuery(data);
    }
    if (this.isDescribeQuery()) {
      result = {};

      for (const _result of data.rows) {
        const enumRegex = /^enum/i;
        result[_result.columnName] = {
          type: enumRegex.test(_result.columnType) ? _result.columnType.replace(enumRegex, 'ENUM') : _result.columnType.toUpperCase(),
          allowNull: _result.isRequired === '0',
          defaultValue: _result.defaultValue,
          primaryKey: _result.isPk === '1',
          autoIncrement: _result.isIncrement === '1',
          comment: _result.columnComment ? _result.columnComment : null
        };
      }
      return result;
    }
    if (this.isShowIndexesQuery()) {
      return this.handleShowIndexesQuery(data);
    }
    if (this.isCallQuery()) {
      return data[0];
    }
    if (this.isBulkUpdateQuery() || this.isBulkDeleteQuery()) {
      return data.rowsAffected;
    }
    if (this.isVersionQuery()) {
      const version = data.rows[0].BANNER;
      return version ? version.substr(version.indexOf('V')) : null;
    }
    if (this.isForeignKeysQuery()) {
      return data;
    }
    if (this.isUpsertQuery()) {
      return [result, data.rowsAffected === 1];
    }
    if (this.isInsertQuery() || this.isUpdateQuery()) {
      return [result, data.rowsAffected];
    }
    if (this.isShowConstraintsQuery()) {
      return data.rows;
    }
    if (this.isRawQuery()) {
      return [data.rows, data.metaData];
    }

    return result;
  }

  async logWarnings(results) {
    const warningResults = await this.run('SHOW WARNINGS');
    const warningMessage = `DMDB Warnings (${this.connection.uuid || 'default'}): `;
    const messages = [];
    for (const _warningRow of warningResults) {
      if (_warningRow === undefined || typeof _warningRow[Symbol.iterator] !== 'function') {
        continue;
      }
      for (const _warningResult of _warningRow) {
        if (Object.prototype.hasOwnProperty.call(_warningResult, 'Message')) {
          messages.push(_warningResult.Message);
        } else {
          for (const _objectKey of _warningResult.keys()) {
            messages.push([_objectKey, _warningResult[_objectKey]].join(': '));
          }
        }
      }
    }

    this.sequelize.log(warningMessage + messages.join('; '), this.options);

    return results;
  }

  formatError(err, errStack) {
    const errCode = err.errno || err.code;

    switch (errCode) {
      case ER_DUP_ENTRY: {
        const match = err.message.match(/Duplicate entry '([\s\S]*)' for key '?((.|\s)*?)'?$/);
        let fields = {};
        let message = 'Validation error';
        const values = match ? match[1].split('-') : undefined;
        const fieldKey = match ? match[2].split('.').pop() : undefined;
        const fieldVal = match ? match[1] : undefined;
        const uniqueKey = this.model && this.model.uniqueKeys[fieldKey];

        if (uniqueKey) {
          if (uniqueKey.msg) message = uniqueKey.msg;
          fields = _.zipObject(uniqueKey.fields, values);
        } else {
          fields[fieldKey] = fieldVal;
        }

        const errors = [];
        _.forOwn(fields, (value, field) => {
          errors.push(new sequelizeErrors.ValidationErrorItem(
            this.getUniqueConstraintErrorMessage(field),
            'unique violation', // sequelizeErrors.ValidationErrorItem.Origins.DB,
            field,
            value,
            this.instance,
            'not_unique'
          ));
        });

        return new sequelizeErrors.UniqueConstraintError({ message, errors, parent: err, fields, stack: errStack });
      }

      case ER_ROW_IS_REFERENCED:
      case ER_NO_REFERENCED_ROW: {
        // e.g. CONSTRAINT `example_constraint_name` FOREIGN KEY (`example_id`) REFERENCES `examples` (`id`)
        const match = err.message.match(
          /CONSTRAINT ([`"])(.*)\1 FOREIGN KEY \(\1(.*)\1\) REFERENCES \1(.*)\1 \(\1(.*)\1\)/
        );
        const quoteChar = match ? match[1] : '`';
        const fields = match ? match[3].split(new RegExp(`${quoteChar}, *${quoteChar}`)) : undefined;

        return new sequelizeErrors.ForeignKeyConstraintError({
          reltype: String(errCode) === String(ER_ROW_IS_REFERENCED) ? 'parent' : 'child',
          table: match ? match[4] : undefined,
          fields,
          value: fields && fields.length && this.instance && this.instance[fields[0]] || undefined,
          index: match ? match[2] : undefined,
          parent: err,
          stack: errStack
        });
      }

      default:
        return new sequelizeErrors.DatabaseError(err, { stack: errStack });
    }
  }

  handleShowIndexesQuery(data) {
    data = data.rows.reduce((acc, item) => {
      if (!(item.INDEX_NAME in acc)) {
        acc[item.INDEX_NAME] = item;
        item.fields = [];
      }
      acc[item.INDEX_NAME].fields.push({
        attribute: undefined,
        length: undefined,
        order: undefined
      });
      return acc;
    }, {});
    return _.map(data, item => ({
      primary: undefined,
      fields: item.fields,
      name: item.INDEX_NAME,
      tableName: item.TABLE_NAME,
      unique: item.UNIQUENESS === 'UNIQUE',
      type: item.INDEX_TYPE
    }));
  }

  handleInsertQuery(results) {
    if (this.instance) {
      // add the inserted row id to the instance
      const autoIncrementAttribute = this.model.autoIncrementAttribute;
      let id = null;

      id = id || results && results[this.getInsertIdField()];
      this.instance[autoIncrementAttribute] = id;
    }
  }

  handleShowTablesQuery(results) {
    return results.rows.map(resultSet => ({
      tableName: resultSet.TABLE_NAME,
      schema: resultSet.TABLESPACE_NAME
    }));
  }
}

module.exports = Query;
module.exports.Query = Query;
module.exports.default = Query;
