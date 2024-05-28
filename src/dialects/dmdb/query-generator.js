'use strict';

const _ = require('lodash');
const uuidv4 = require('uuid').v4;
const Utils = require('../../utils');
const AbstractQueryGenerator = require('../abstract/query-generator');
const deprecations = require('../../utils/deprecations');
const util = require('util');
const BelongsTo = require('../../associations/belongs-to');
// const DataTypes = require('../../data-types');
// const Model = require('../../model');
// const Association = require('../../associations/base');
const Op = require('../../operators');


const JSON_FUNCTION_REGEX = /^\s*((?:[a-z]+_){0,2}jsonb?(?:_[a-z]+){0,2})\([^)]*\)/i;
const JSON_OPERATOR_REGEX = /^\s*(->>?|@>|<@|\?[|&]?|\|{2}|#-)/i;
const TOKEN_CAPTURE_REGEX = /^\s*((?:([`"'])(?:(?!\2).|\2{2})*\2)|[\w\d\s]+|[().,;+-])/i;
const FOREIGN_KEY_FIELDS = [
  'a.OWNER as schemaName',
  'a.TABLE_NAME as tableName',
  'b.COLUMN_NAME as columnName',
  'a.CONSTRAINT_NAME as constraintName',
  'a.CONSTRAINT_TYPE as constraintType'
].join(',');

const typeWithoutDefault = new Set(['BLOB', 'TEXT', 'GEOMETRY', 'JSON']);

class DMDBQueryGenerator extends AbstractQueryGenerator {
  constructor(options) {
    super(options);

    this.OperatorMap = {
      ...this.OperatorMap,
      [Op.regexp]: 'REGEXP',
      [Op.notRegexp]: 'NOT REGEXP'
    };
  }

  createDatabaseQuery(databaseName, options) {
    options = {
      charset: null,
      collate: null,
      ...options
    };

    return Utils.joinSQLFragments([
      'CREATE DATABASE IF NOT EXISTS',
      this.quoteIdentifier(databaseName),
      options.charset && `DEFAULT CHARACTER SET ${this.escape(options.charset)}`,
      options.collate && `DEFAULT COLLATE ${this.escape(options.collate)}`,
      ';'
    ]);
  }

  dropDatabaseQuery(databaseName) {
    return `DROP DATABASE IF EXISTS ${this.quoteIdentifier(databaseName)};`;
  }

  createSchema() {
    return 'SHOW TABLES';
  }

  showSchemasQuery() {
    return 'SHOW TABLES';
  }

  versionQuery() {
    return 'SELECT * from v$version';
  }

  createTableQuery(tableName, attributes, options) {
    options = {
      engine: 'InnoDB',
      charset: null,
      rowFormat: null,
      ...options
    };

    const primaryKeys = [];
    const foreignKeys = {};
    const attrStr = [];

    for (const attr in attributes) {
      if (!Object.prototype.hasOwnProperty.call(attributes, attr)) continue;
      const dataType = attributes[attr];
      let match;

      if (dataType.includes('PRIMARY KEY')) {
        primaryKeys.push(attr);

        if (dataType.includes('REFERENCES')) {
          // MySQL doesn't support inline REFERENCES declarations: move to the end
          match = dataType.match(/^(.+) (REFERENCES.*)$/);
          attrStr.push(`${this.quoteIdentifier(attr)} ${match[1].replace('PRIMARY KEY', '')}`);
          foreignKeys[attr] = match[2];
        } else {
          attrStr.push(`${this.quoteIdentifier(attr)} ${dataType.replace('PRIMARY KEY', '')}`);
        }
      } else if (dataType.includes('REFERENCES')) {
        // MySQL doesn't support inline REFERENCES declarations: move to the end
        match = dataType.match(/^(.+) (REFERENCES.*)$/);
        attrStr.push(`${this.quoteIdentifier(attr)} ${match[1]}`);
        foreignKeys[attr] = match[2];
      } else {
        attrStr.push(`${this.quoteIdentifier(attr)} ${dataType}`);
      }
    }

    const table = this.quoteTable(tableName);
    let attributesClause = attrStr.join(', ');
    const pkString = primaryKeys.map(pk => this.quoteIdentifier(pk)).join(', ');

    if (options.uniqueKeys) {
      _.each(options.uniqueKeys, (columns, indexName) => {
        if (columns.customIndex) {
          if (typeof indexName !== 'string') {
            indexName = `uniq_${tableName}_${columns.fields.join('_')}`;
          }
          attributesClause += `, UNIQUE ${this.quoteIdentifier(indexName)} (${columns.fields.map(field => this.quoteIdentifier(field)).join(', ')})`;
        }
      });
    }

    if (pkString.length > 0) {
      attributesClause += `, PRIMARY KEY (${pkString})`;
    }

    for (const fkey in foreignKeys) {
      if (Object.prototype.hasOwnProperty.call(foreignKeys, fkey)) {
        attributesClause += `, FOREIGN KEY (${this.quoteIdentifier(fkey)}) ${foreignKeys[fkey]}`;
      }
    }

    return Utils.joinSQLFragments([
      'CREATE TABLE IF NOT EXISTS',
      table,
      `(${attributesClause})`,
      ';'
    ]);
  }

  describeTableQuery(tableName, schema, schemaDelimiter) {
    const table = this.quoteTable(
      this.addSchema({
        tableName,
        _schema: schema,
        _schemaDelimiter: schemaDelimiter
      })
    );

    return `
      SELECT
        a.column_name AS columnName,
        a.data_type AS columnType,
        (CASE
          WHEN (a.nullable = 'N') THEN '1'
          ELSE '0'
        END) AS isRequired,
        (CASE
          WHEN b.column_name != 'NULL' THEN '1'
          ELSE '0'
        END) AS isPk,
        (CASE
          WHEN d.info2 = 1 THEN '1'
          ELSE '0'
        END) AS isIncrement,
        a.column_id AS sort,
        a.DATA_DEFAULT AS defaultValue,
        c.comment$ AS columnComment
      FROM
        all_tab_columns a
      LEFT JOIN (
        SELECT
          TOP 1 *
        FROM
          user_ind_columns
        WHERE
          table_name = '${table}') b ON
        b.column_name = a.column_name
      LEFT JOIN SYSCOLUMNCOMMENTS c ON
        c.colname = a.column_name
        AND c.tvname = a.table_name
      LEFT JOIN syscolumns d ON
        d.name = a.column_name
        AND d.INFO2 & 1 = 1
      WHERE
        a.owner = '${schema || this.options.database}'
        AND a.Table_Name = '${table}'
      ORDER BY a.column_id;
    `;
  }

  showTablesQuery(database) {
    let query = 'SELECT TABLE_NAME, TABLESPACE_NAME FROM USER_TABLES';
    if (database) {
      query += ` WHERE TABLESPACE_NAME = ${this.escape(database)}`;
    }
    return `${query};`;
  }

  tableExistsQuery(table) {
    const tableName = this.escape(this.quoteTable(table));

    return `SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME = ${tableName} AND TABLESPACE_NAME = ${this.escape(this.sequelize.config.database)}`;
  }

  dropTableQuery(tableName) {
    return `DROP TABLE IF EXISTS ${this.quoteTable(tableName)} CASCADE;`;
  }

  addColumnQuery(table, key, dataType) {
    return Utils.joinSQLFragments([
      'ALTER TABLE',
      this.quoteTable(table),
      'ADD',
      this.quoteIdentifier(key),
      this.attributeToSQL(dataType, {
        context: 'addColumn',
        tableName: table,
        foreignKey: key
      }),
      ';'
    ]);
  }

  removeColumnQuery(tableName, attributeName) {
    return Utils.joinSQLFragments([
      'ALTER TABLE',
      this.quoteTable(tableName),
      'DROP',
      this.quoteIdentifier(attributeName),
      'CASCADE;'
    ]);
  }

  changeColumnQuery(tableName, attributes) {
    const attrString = [];
    const constraintString = [];

    for (const attributeName in attributes) {
      let definition = attributes[attributeName];
      if (definition.includes('REFERENCES')) {
        const attrName = this.quoteIdentifier(attributeName);
        definition = definition.replace(/.+?(?=REFERENCES)/, '');
        constraintString.push(`FOREIGN KEY (${attrName}) ${definition}`);
      } else {
        attrString.push(`${attributeName} ${definition}`);
      }
    }

    return Utils.joinSQLFragments([
      'ALTER TABLE',
      this.quoteTable(tableName),
      attrString.length && `MODIFY ${attrString.join(', ')}`,
      constraintString.length && `ADD ${constraintString.join(', ')}`,
      ';'
    ]);
  }

  renameColumnQuery(tableName, attrBefore, attributes) {
    const attrString = [];

    for (const attrName in attributes) {
      attrString.push(`${attrBefore} TO ${attrName}`);
    }

    return Utils.joinSQLFragments([
      'ALTER TABLE',
      this.quoteTable(tableName),
      'RENAME COLUMN',
      attrString.join(', '),
      ';'
    ]);
  }

  handleSequelizeMethod(smth, tableName, factory, options, prepend) {
    if (smth instanceof Utils.Json) {
      // Parse nested object
      if (smth.conditions) {
        const conditions = this.parseConditionObject(smth.conditions).map(condition =>
          `${this.jsonPathExtractionQuery(condition.path[0], _.tail(condition.path))} = '${condition.value}'`
        );

        return conditions.join(' AND ');
      }
      if (smth.path) {
        let str;

        // Allow specifying conditions using the sqlite json functions
        if (this._checkValidJsonStatement(smth.path)) {
          str = smth.path;
        } else {
          // Also support json property accessors
          const paths = _.toPath(smth.path);
          const column = paths.shift();
          str = this.jsonPathExtractionQuery(column, paths);
        }

        if (smth.value) {
          str += util.format(' = %s', this.escape(smth.value));
        }

        return str;
      }
    } else if (smth instanceof Utils.Cast) {
      if (/timestamp/i.test(smth.type)) {
        smth.type = 'datetime';
      } else if (smth.json && /boolean/i.test(smth.type)) {
        // true or false cannot be casted as booleans within a JSON structure
        smth.type = 'char';
      } else if (/double precision/i.test(smth.type) || /boolean/i.test(smth.type) || /integer/i.test(smth.type)) {
        smth.type = 'decimal';
      } else if (/text/i.test(smth.type)) {
        smth.type = 'char';
      }
    }

    return super.handleSequelizeMethod(smth, tableName, factory, options, prepend);
  }

  _toJSONValue(value) {
    // true/false are stored as strings in mysql
    if (typeof value === 'boolean') {
      return value.toString();
    }
    // null is stored as a string in mysql
    if (value === null) {
      return 'null';
    }
    return value;
  }

  truncateTableQuery(tableName) {
    return `TRUNCATE ${this.quoteTable(tableName)}`;
  }

  deleteQuery(tableName, where, options = {}, model) {
    let limit = '';
    let query = `DELETE FROM ${this.quoteTable(tableName)}`;

    if (options.limit) {
      limit = ` LIMIT ${this.escape(options.limit)}`;
    }

    where = this.getWhereConditions(where, null, model, options);

    if (where) {
      query += ` WHERE ${where}`;
    }

    return query + limit;
  }

  showIndexesQuery(tableName, options) {
    return `SELECT * FROM ALL_INDEXES WHERE TABLE_NAME = ${this.escape(tableName)} AND OWNER = '${options.sequelize.config.username}'`;
  }

  showConstraintsQuery(table, constraintName) {
    const tableName = table.tableName || table;
    const schemaName = table.schema;

    return Utils.joinSQLFragments([
      'SELECT',
      FOREIGN_KEY_FIELDS,
      'FROM DBA_CONSTRAINTS a, ALL_CONS_COLUMNS b',
      'WHERE a.CONSTRAINT_NAME = b.CONSTRAINT_NAME',
      `AND a.TABLE_NAME = '${tableName}'`,
      constraintName && `AND a.CONSTRAINT_NAME = '${constraintName}'`,
      schemaName && `AND a.OWNER = '${schemaName}'`,
      ';'
    ]);
  }

  removeIndexQuery(tableName, indexNameOrAttributes) {
    let indexName = indexNameOrAttributes;

    if (typeof indexName !== 'string') {
      indexName = Utils.underscore(`${tableName}_${indexNameOrAttributes.join('_')}`);
    }

    return Utils.joinSQLFragments([
      'DROP INDEX',
      `${this.options.database}.${this.quoteIdentifier(indexName)}`
    ]);
  }

  attributeToSQL(attribute, options) {
    if (!_.isPlainObject(attribute)) {
      attribute = {
        type: attribute
      };
    }

    const attributeString = attribute.type.toString({ escape: this.escape.bind(this) });
    let template = attributeString;

    if (attribute.allowNull === false) {
      template += ' NOT NULL';
    }

    if (attribute.autoIncrement) {
      template += ' IDENTITY(1,1)';
    }

    // BLOB/TEXT/GEOMETRY/JSON cannot have a default value
    if (!typeWithoutDefault.has(attributeString)
      && attribute.type._binary !== true
      && Utils.defaultValueSchemable(attribute.defaultValue)) {
      template += ` DEFAULT ${this.escape(attribute.defaultValue)}`;
    }

    if (attribute.unique === true) {
      template += ' UNIQUE';
    }

    if (attribute.primaryKey) {
      template += ' PRIMARY KEY';
    }

    if (attribute.comment) {
      // template += ` COMMENT ${this.escape(attribute.comment)}`;
    }

    if (attribute.first) {
      template += ' FIRST';
    }
    if (attribute.after) {
      template += ` AFTER ${this.quoteIdentifier(attribute.after)}`;
    }

    if (attribute.references) {
      if (options && options.context === 'addColumn' && options.foreignKey) {
        const attrName = this.quoteIdentifier(options.foreignKey);
        const fkName = this.quoteIdentifier(`${options.tableName}_${attrName}_foreign_idx`);

        template += `, ADD CONSTRAINT ${fkName} FOREIGN KEY (${attrName})`;
      }

      template += ` REFERENCES ${this.quoteTable(attribute.references.model)}`;

      if (attribute.references.key) {
        template += ` (${this.quoteIdentifier(attribute.references.key)})`;
      } else {
        template += ` (${this.quoteIdentifier('id')})`;
      }

      if (attribute.onDelete) {
        template += ` ON DELETE ${attribute.onDelete.toUpperCase()}`;
      }

      if (attribute.onUpdate) {
        template += ` ON UPDATE ${attribute.onUpdate.toUpperCase()}`;
      }
    }

    return template;
  }

  attributesToSQL(attributes, options) {
    const result = {};

    for (const key in attributes) {
      const attribute = attributes[key];
      result[attribute.field || key] = this.attributeToSQL(attribute, options);
    }

    return result;
  }

  /**
   * Check whether the statmement is json function or simple path
   *
   * @param   {string}  stmt  The statement to validate
   * @returns {boolean}       true if the given statement is json function
   * @throws  {Error}         throw if the statement looks like json function but has invalid token
   * @private
   */
  _checkValidJsonStatement(stmt) {
    if (typeof stmt !== 'string') {
      return false;
    }

    let currentIndex = 0;
    let openingBrackets = 0;
    let closingBrackets = 0;
    let hasJsonFunction = false;
    let hasInvalidToken = false;

    while (currentIndex < stmt.length) {
      const string = stmt.substr(currentIndex);
      const functionMatches = JSON_FUNCTION_REGEX.exec(string);
      if (functionMatches) {
        currentIndex += functionMatches[0].indexOf('(');
        hasJsonFunction = true;
        continue;
      }

      const operatorMatches = JSON_OPERATOR_REGEX.exec(string);
      if (operatorMatches) {
        currentIndex += operatorMatches[0].length;
        hasJsonFunction = true;
        continue;
      }

      const tokenMatches = TOKEN_CAPTURE_REGEX.exec(string);
      if (tokenMatches) {
        const capturedToken = tokenMatches[1];
        if (capturedToken === '(') {
          openingBrackets++;
        } else if (capturedToken === ')') {
          closingBrackets++;
        } else if (capturedToken === ';') {
          hasInvalidToken = true;
          break;
        }
        currentIndex += tokenMatches[0].length;
        continue;
      }

      break;
    }

    // Check invalid json statement
    if (hasJsonFunction && (hasInvalidToken || openingBrackets !== closingBrackets)) {
      throw new Error(`Invalid json statement: ${stmt}`);
    }

    // return true if the statement has valid json function
    return hasJsonFunction;
  }

  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {object} table  The table.
   * @param  {string} schemaName The name of the schema.
   * @returns {string}            The generated sql query.
   * @private
   */
  getForeignKeysQuery(table, schemaName) {
    const quotedSchemaName = wrapSingleQuote(schemaName);
    const quotedTableName = wrapSingleQuote(table.tableName || table);

    return Utils.joinSQLFragments([
      'SELECT',
      FOREIGN_KEY_FIELDS,
      'FROM DBA_CONSTRAINTS a, ALL_CONS_COLUMNS b',
      "WHERE a.CONSTRAINT_NAME = b.CONSTRAINT_NAME AND CONSTRAINT_TYPE = 'R'",
      `AND a.OWNER = ${quotedSchemaName}`,
      `AND a.TABLE_NAME = ${quotedTableName}`
    ]);
  }

  /**
   * Generates an SQL query that returns the foreign key constraint of a given column.
   *
   * @param  {object} table  The table.
   * @param  {string} columnName The name of the column.
   * @returns {string}            The generated sql query.
   * @private
   */
  getForeignKeyQuery(table, columnName) {
    const quotedSchemaName = table.schema ? wrapSingleQuote(table.schema) : '';
    const quotedTableName = wrapSingleQuote(table.tableName || table);
    const quotedColumnName = wrapSingleQuote(columnName);

    return Utils.joinSQLFragments([
      'SELECT',
      FOREIGN_KEY_FIELDS,
      'FROM DBA_CONSTRAINTS a, ALL_CONS_COLUMNS b',
      "WHERE a.CONSTRAINT_NAME = b.CONSTRAINT_NAME AND CONSTRAINT_TYPE = 'R'",
      `AND a.OWNER = ${quotedSchemaName}`,
      `AND a.TABLE_NAME = ${quotedTableName}`,
      `AND b.COLUMN_NAME = ${quotedColumnName}`
    ]);
  }

  /**
   * Generates an SQL query that removes a foreign key from a table.
   *
   * @param  {string} tableName  The name of the table.
   * @param  {string} foreignKey The name of the foreign key constraint.
   * @returns {string}            The generated sql query.
   * @private
   */
  dropForeignKeyQuery(tableName, foreignKey) {
    return Utils.joinSQLFragments([
      'ALTER TABLE',
      this.quoteTable(tableName),
      'DROP CONSTRAINT',
      this.quoteIdentifier(foreignKey),
      ';'
    ]);
  }

  /**
   * Quote identifier in sql clause
   *
   * @param {string} identifier
   * @param {boolean} force
   *
   * @returns {string}
   */
  quoteIdentifier(identifier, force) {
    return Utils.addTicks(Utils.removeTicks(identifier, '"'), '"');
  }

  quoteIdentifiers(identifiers) {
    if (identifiers.includes('.')) {
      identifiers = identifiers.split('.');
      const head = identifiers.slice(0, identifiers.length - 1).join('->');
      const tail = identifiers[identifiers.length - 1];
      return `${this.quoteIdentifier(head)}.${tail}`;
    }
    return identifiers;
  }

  quoteTable(param, alias) {
    let table = '';
    if (alias === true) {
      alias = param.as || param.name || param;
    }
    if (_.isObject(param)) {
      if (this._dialect.supports.schemas) {
        if (param.schema) {
          table += `${param.schema}.`;
        }
        table += param.tableName;
      } else {
        if (param.schema) {
          table += param.schema + (param.delimiter || '');
        }
        table += param.tableName;
        table = this.quoteIdentifier(table);
      }
    } else if (/->/.test(param)) {
      table = this.quoteIdentifier(param);
    } else {
      table = param;
    }
    if (alias) {
      table += ` AS ${this.quoteIdentifier(alias)}`;
    }
    return table;
  }

  /**
   * Returns an insert into command for multiple values.
   *
   * @param {string} tableName
   * @param {object} fieldValueHashes
   * @param {object} options
   * @param {object} fieldMappedAttributes
   *
   * @private
   */
  bulkInsertQuery(tableName, fieldValueHashes, options, fieldMappedAttributes) {
    options = options || {};
    fieldMappedAttributes = fieldMappedAttributes || {};

    const tuples = [];
    const serials = {};
    let allAttributes = [];
    let needIdentityInsertWrapper = false;

    for (const fieldValueHash of fieldValueHashes) {
      // eslint-disable-next-line no-loop-func
      _.forOwn(fieldValueHash, (_value, key) => {
        if (!allAttributes.includes(key)) {
          allAttributes.push(key);
        }
        // XXX seed 的时候 fieldMappedAttributes 为 undefined，结合项目情况id都是自增
        if (key === 'id') {
          needIdentityInsertWrapper = true;
        }
        if (
          fieldMappedAttributes[key]
          && fieldMappedAttributes[key].autoIncrement === true
        ) {
          serials[key] = true;
          needIdentityInsertWrapper = true;
        }
      });
    }
    allAttributes = allAttributes.filter(key => !serials[key]);

    for (const fieldValueHash of fieldValueHashes) {
      const values = allAttributes.map(key => {
        if (
          this._dialect.supports.bulkDefault
          && serials[key] === true
        ) {
          // fieldValueHashes[key] ?? 'DEFAULT'
          return fieldValueHash[key] != null ? fieldValueHash[key] : 'DEFAULT';
        }

        return this.escape(fieldValueHash[key], fieldMappedAttributes[key], { context: 'INSERT' });
      });

      tuples.push(`(${values.join(',')})`);
    }

    const ignoreDuplicates = options.ignoreDuplicates ? this._dialect.supports.inserts.ignoreDuplicates : '';
    const attributes = allAttributes.map(attr => attr).join(',');

    const quotedTable = this.quoteTable(tableName);
    let query = Utils.joinSQLFragments([
      'INSERT',
      ignoreDuplicates,
      'INTO',
      quotedTable,
      this.quoteTable(tableName),
      `(${attributes})`,
      'VALUES',
      tuples.join(','),
      ';'
    ]);
    if (needIdentityInsertWrapper) {
      query = `SET IDENTITY_INSERT ${quotedTable} ON; ${query} SET IDENTITY_INSERT ${quotedTable} OFF;`;
    }
    return query;
  }

  escapeAttributes(attributes, options, mainTableAs) {
    return attributes && attributes.map(attr => {
      attr = Array.isArray(attr) ? attr : [attr, attr];
      let addTable = true;
      if (attr instanceof Utils.SequelizeMethod) {
        return this.handleSequelizeMethod(attr);
      }
      if (Array.isArray(attr)) {
        if (attr.length !== 2) {
          throw new Error(`${JSON.stringify(attr)} is not a valid attribute definition. Please use the following format: ['attribute definition', 'alias']`);
        }
        attr = attr.slice();
        if (attr[0] instanceof Utils.SequelizeMethod) {
          attr[0] = this.handleSequelizeMethod(attr[0]);
          addTable = false;
        } else if (!attr[0].includes('(') && !attr[0].includes(')')) {
          // attr[0] = this.quoteIdentifier(attr[0]);
        } else {
          deprecations.noRawAttributes();
        }
        let alias = attr[1];
        if (this.options.minifyAliases) {
          alias = this._getMinifiedAlias(alias, mainTableAs, options);
        }
        attr = [attr[0], this.quoteIdentifier(alias)].join(' AS ');
      } else {
        attr = !attr.includes(Utils.TICK_CHAR) && !attr.includes('"') ? this.quoteAttribute(attr, options.model) : this.escape(attr);
      }
      if (!_.isEmpty(options.include) && (!attr.includes('.') || options.dotNotation) && addTable) {
        attr = `${mainTableAs}.${attr}`;
      }
      return attr;
    });
  }

  insertQuery(table, valueHash, modelAttributes, options) {
    options = options || {};
    _.defaults(options, this.options);

    const modelAttributeMap = {};
    const bind = [];
    const fields = [];
    const returningModelAttributes = [];
    const values = [];
    const quotedTable = this.quoteTable(table);
    const bindParam = options.bindParam === undefined ? this.bindParam(bind) : options.bindParam;
    let query;
    let valueQuery = '';
    let emptyQuery = '';
    let outputFragment = '';
    let returningFragment = '';
    let identityWrapperRequired = false;
    let tmpTable = ''; //tmpTable declaration for trigger

    if (modelAttributes) {
      _.each(modelAttributes, (attribute, key) => {
        modelAttributeMap[key] = attribute;
        if (attribute.field) {
          modelAttributeMap[attribute.field] = attribute;
        }
      });
    }

    if (this._dialect.supports['DEFAULT VALUES']) {
      emptyQuery += ' DEFAULT VALUES';
    } else if (this._dialect.supports['VALUES ()']) {
      emptyQuery += ' VALUES ()';
    }

    if (this._dialect.supports.returnValues && options.returning) {
      const returnValues = this.generateReturnValues(modelAttributes, options);

      returningModelAttributes.push(...returnValues.returnFields);
      returningFragment = returnValues.returningFragment;
      tmpTable = returnValues.tmpTable || '';
      outputFragment = returnValues.outputFragment || '';
    }

    if (_.get(this, ['sequelize', 'options', 'dialectOptions', 'prependSearchPath']) || options.searchPath) {
      // Not currently supported with search path (requires output of multiple queries)
      options.bindParam = false;
    }

    if (this._dialect.supports.EXCEPTION && options.exception) {
      // Not currently supported with bind parameters (requires output of multiple queries)
      options.bindParam = false;
    }

    valueHash = Utils.removeNullValuesFromHash(valueHash, this.options.omitNull);
    for (const key in valueHash) {
      if (Object.prototype.hasOwnProperty.call(valueHash, key)) {
        const value = valueHash[key];
        fields.push(key);

        // SERIALS' can't be NULL in postgresql, use DEFAULT where supported
        if (modelAttributeMap && modelAttributeMap[key] && modelAttributeMap[key].autoIncrement === true && value == null) {
          if (!this._dialect.supports.autoIncrement.defaultValue) {
            fields.splice(-1, 1);
          } else if (this._dialect.supports.DEFAULT) {
            values.push('DEFAULT');
          } else {
            values.push(this.escape(null));
          }
        } else {
          if (modelAttributeMap && modelAttributeMap[key] && modelAttributeMap[key].autoIncrement === true) {
            identityWrapperRequired = true;
          }

          if (value instanceof Utils.SequelizeMethod || options.bindParam === false) {
            values.push(this.escape(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'INSERT' }));
          } else {
            values.push(this.format(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'INSERT' }, bindParam));
          }
        }
      }
    }

    const replacements = {
      ignoreDuplicates: options.ignoreDuplicates ? this._dialect.supports.inserts.ignoreDuplicates : '',
      onConflictDoNothing: options.ignoreDuplicates ? this._dialect.supports.inserts.onConflictDoNothing : '',
      attributes: fields.join(','),
      output: outputFragment,
      values: values.join(','),
      tmpTable
    };

    valueQuery = `${tmpTable}INSERT${replacements.ignoreDuplicates} INTO ${quotedTable} (${replacements.attributes})${replacements.output} VALUES (${replacements.values})${replacements.onConflictDoNothing}${valueQuery}`;
    emptyQuery = `${tmpTable}INSERT${replacements.ignoreDuplicates} INTO ${quotedTable}${replacements.output}${replacements.onConflictDoNothing}${emptyQuery}`;

    // Mostly for internal use, so we expect the user to know what he's doing!
    // pg_temp functions are private per connection, so we never risk this function interfering with another one.
    if (this._dialect.supports.EXCEPTION && options.exception) {
      const dropFunction = 'DROP FUNCTION IF EXISTS pg_temp.testfunc()';

      if (returningModelAttributes.length === 0) {
        returningModelAttributes.push('*');
      }

      const delimiter = `$func_${uuidv4().replace(/-/g, '')}$`;
      const selectQuery = `SELECT (testfunc.response).${returningModelAttributes.join(', (testfunc.response).')}, testfunc.sequelize_caught_exception FROM pg_temp.testfunc();`;

      options.exception = 'WHEN unique_violation THEN GET STACKED DIAGNOSTICS sequelize_caught_exception = PG_EXCEPTION_DETAIL;';
      valueQuery = `CREATE OR REPLACE FUNCTION pg_temp.testfunc(OUT response ${quotedTable}, OUT sequelize_caught_exception text) RETURNS RECORD AS ${delimiter} BEGIN ${valueQuery} RETURNING * INTO response; EXCEPTION ${options.exception} END ${delimiter} LANGUAGE plpgsql; ${selectQuery} ${dropFunction}`;
    } else {
      valueQuery += returningFragment;
      emptyQuery += returningFragment;
    }

    query = `${replacements.attributes.length ? valueQuery : emptyQuery};`;
    if (this._dialect.supports.finalTable) {
      query = `SELECT * FROM FINAL TABLE(${ replacements.attributes.length ? valueQuery : emptyQuery });`;
    }
    if (identityWrapperRequired && this._dialect.supports.autoIncrement.identityInsert) {
      query = `SET IDENTITY_INSERT ${quotedTable} ON; ${query} SET IDENTITY_INSERT ${quotedTable} OFF;`;
    }

    // Used by Postgres upsertQuery and calls to here with options.exception set to true
    const result = { query };
    if (options.bindParam !== false) {
      result.bind = bind;
    }

    return result;
  }

  updateQuery(tableName, attrValueHash, where, options, attributes) {
    options = options || {};
    _.defaults(options, this.options);

    attrValueHash = Utils.removeNullValuesFromHash(attrValueHash, options.omitNull, options);

    const values = [];
    const bind = [];
    const modelAttributeMap = {};
    let outputFragment = '';
    let tmpTable = ''; // tmpTable declaration for trigger
    let suffix = '';

    if (_.get(this, ['sequelize', 'options', 'dialectOptions', 'prependSearchPath']) || options.searchPath) {
      // Not currently supported with search path (requires output of multiple queries)
      options.bindParam = false;
    }

    const bindParam = options.bindParam === undefined ? this.bindParam(bind) : options.bindParam;

    if (this._dialect.supports['LIMIT ON UPDATE'] && options.limit) {
      if (this.dialect !== 'mssql' && this.dialect !== 'db2') {
        suffix = ` LIMIT ${this.escape(options.limit)} `;
      }
    }

    if (this._dialect.supports.returnValues && options.returning) {
      const returnValues = this.generateReturnValues(attributes, options);

      suffix += returnValues.returningFragment;
      tmpTable = returnValues.tmpTable || '';
      outputFragment = returnValues.outputFragment || '';

      // ensure that the return output is properly mapped to model fields.
      if (!this._dialect.supports.returnValues.output && options.returning) {
        options.mapToModel = true;
      }
    }

    if (attributes) {
      _.each(attributes, (attribute, key) => {
        modelAttributeMap[key] = attribute;
        if (attribute.field) {
          modelAttributeMap[attribute.field] = attribute;
        }
      });
    }

    for (const key in attrValueHash) {
      if (modelAttributeMap && modelAttributeMap[key] &&
        modelAttributeMap[key].autoIncrement === true &&
        !this._dialect.supports.autoIncrement.update) {
        // not allowed to update identity column
        continue;
      }

      const value = attrValueHash[key];

      if (value instanceof Utils.SequelizeMethod || options.bindParam === false) {
        values.push(`${this.quoteIdentifier(key)}=${this.escape(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'UPDATE' })}`);
      } else {
        values.push(`${key}=${this.format(value, modelAttributeMap && modelAttributeMap[key] || undefined, { context: 'UPDATE' }, bindParam)}`);
      }
    }

    const whereOptions = { ...options, bindParam };

    if (values.length === 0) {
      return '';
    }

    const query = `${tmpTable}UPDATE ${this.quoteTable(tableName)} SET ${values.join(',')}${outputFragment} ${this.whereQuery(where, whereOptions)}${suffix}`.trim();
    // Used by Postgres upsertQuery and calls to here with options.exception set to true
    const result = { query };
    if (options.bindParam !== false) {
      result.bind = bind;
    }
    return result;
  }

  _getSafeKey(key, prefix) {
    if (key instanceof Utils.SequelizeMethod) {
      key = this.handleSequelizeMethod(key);
      return this._prefixKey(this.handleSequelizeMethod(key), prefix);
    }

    if (Utils.isColString(key)) {
      key = key.substr(1, key.length - 2).split('.');

      if (key.length > 2) {
        key = [
          // join the tables by -> to match out internal namings
          key.slice(0, -1).join('->'),
          key[key.length - 1]
        ];
      }

      return key.map(identifier => this.quoteIdentifier(identifier)).join('.');
    }

    return this._prefixKey(key, prefix);
  }

  generateInclude(include, parentTableName, topLevelInfo) {
    const joinQueries = {
      mainQuery: [],
      subQuery: []
    };
    const mainChildIncludes = [];
    const subChildIncludes = [];
    let requiredMismatch = false;
    const includeAs = {
      internalAs: include.as,
      externalAs: include.as
    };
    const attributes = {
      main: [],
      subQuery: []
    };
    let joinQuery;

    topLevelInfo.options.keysEscaped = true;

    if (topLevelInfo.names.name !== parentTableName.externalAs && topLevelInfo.names.as !== parentTableName.externalAs) {
      includeAs.internalAs = `${parentTableName.internalAs}->${include.as}`;
      includeAs.externalAs = `${parentTableName.externalAs}.${include.as}`;
    }

    // includeIgnoreAttributes is used by aggregate functions
    if (topLevelInfo.options.includeIgnoreAttributes !== false) {
      include.model._expandAttributes(include);
      Utils.mapFinderOptions(include, include.model);

      const includeAttributes = include.attributes.map(attr => {
        let attrAs = attr;
        let verbatim = false;

        if (Array.isArray(attr) && attr.length === 2) {
          if (attr[0] instanceof Utils.SequelizeMethod && (
            attr[0] instanceof Utils.Literal ||
            attr[0] instanceof Utils.Cast ||
            attr[0] instanceof Utils.Fn
          )) {
            verbatim = true;
          }

          attr = attr.map(attr => attr instanceof Utils.SequelizeMethod ? this.handleSequelizeMethod(attr) : attr);

          attrAs = attr[1];
          attr = attr[0];
        }
        if (attr instanceof Utils.Literal) {
          return attr.val; // We trust the user to rename the field correctly
        }
        if (attr instanceof Utils.Cast || attr instanceof Utils.Fn) {
          throw new Error(
            'Tried to select attributes using Sequelize.cast or Sequelize.fn without specifying an alias for the result, during eager loading. ' +
            'This means the attribute will not be added to the returned instance'
          );
        }

        let prefix;
        if (verbatim === true) {
          prefix = attr;
        } else if (/#>>|->>/.test(attr)) {
          prefix = `(${this.quoteIdentifier(includeAs.internalAs)}.${attr.replace(/\(|\)/g, '')})`;
        } else if (/json_extract\(/.test(attr)) {
          prefix = attr.replace(/json_extract\(/i, `json_extract(${this.quoteIdentifier(includeAs.internalAs)}.`);
        } else {
          prefix = `${this.quoteIdentifier(includeAs.internalAs)}.${attr}`;
        }
        let alias = `${includeAs.externalAs}.${attrAs}`;

        if (this.options.minifyAliases) {
          alias = this._getMinifiedAlias(alias, includeAs.internalAs, topLevelInfo.options);
        }

        return Utils.joinSQLFragments([
          prefix,
          'AS',
          this.quoteIdentifier(alias, true)
        ]);
      });
      if (include.subQuery && topLevelInfo.subQuery) {
        for (const attr of includeAttributes) {
          attributes.subQuery.push(attr);
        }
      } else {
        for (const attr of includeAttributes) {
          attributes.main.push(attr);
        }
      }
    }

    //through
    if (include.through) {
      joinQuery = this.generateThroughJoin(include, includeAs, parentTableName.internalAs, topLevelInfo);
    } else {
      this._generateSubQueryFilter(include, includeAs, topLevelInfo);
      joinQuery = this.generateJoin(include, topLevelInfo);
    }

    // handle possible new attributes created in join
    if (joinQuery.attributes.main.length > 0) {
      attributes.main = attributes.main.concat(joinQuery.attributes.main);
    }

    if (joinQuery.attributes.subQuery.length > 0) {
      attributes.subQuery = attributes.subQuery.concat(joinQuery.attributes.subQuery);
    }

    if (include.include) {
      for (const childInclude of include.include) {
        if (childInclude.separate || childInclude._pseudo) {
          continue;
        }

        const childJoinQueries = this.generateInclude(childInclude, includeAs, topLevelInfo);

        if (include.required === false && childInclude.required === true) {
          requiredMismatch = true;
        }
        // if the child is a sub query we just give it to the
        if (childInclude.subQuery && topLevelInfo.subQuery) {
          subChildIncludes.push(childJoinQueries.subQuery);
        }
        if (childJoinQueries.mainQuery) {
          mainChildIncludes.push(childJoinQueries.mainQuery);
        }
        if (childJoinQueries.attributes.main.length > 0) {
          attributes.main = attributes.main.concat(childJoinQueries.attributes.main);
        }
        if (childJoinQueries.attributes.subQuery.length > 0) {
          attributes.subQuery = attributes.subQuery.concat(childJoinQueries.attributes.subQuery);
        }
      }
    }

    if (include.subQuery && topLevelInfo.subQuery) {
      if (requiredMismatch && subChildIncludes.length > 0) {
        joinQueries.subQuery.push(` ${joinQuery.join} ( ${joinQuery.body}${subChildIncludes.join('')} ) ON ${joinQuery.condition}`);
      } else {
        joinQueries.subQuery.push(` ${joinQuery.join} ${joinQuery.body} ON ${joinQuery.condition}`);
        if (subChildIncludes.length > 0) {
          joinQueries.subQuery.push(subChildIncludes.join(''));
        }
      }
      joinQueries.mainQuery.push(mainChildIncludes.join(''));
    } else {
      if (requiredMismatch && mainChildIncludes.length > 0) {
        joinQueries.mainQuery.push(` ${joinQuery.join} ( ${joinQuery.body}${mainChildIncludes.join('')} ) ON ${joinQuery.condition}`);
      } else {
        joinQueries.mainQuery.push(` ${joinQuery.join} ${joinQuery.body} ON ${joinQuery.condition}`);
        if (mainChildIncludes.length > 0) {
          joinQueries.mainQuery.push(mainChildIncludes.join(''));
        }
      }
      joinQueries.subQuery.push(subChildIncludes.join(''));
    }

    return {
      mainQuery: joinQueries.mainQuery.join(''),
      subQuery: joinQueries.subQuery.join(''),
      attributes
    };
  }

  generateJoin(include, topLevelInfo) {
    const association = include.association;
    const parent = include.parent;
    const parentIsTop = !!parent && !include.parent.association && include.parent.model.name === topLevelInfo.options.model.name;
    let $parent;
    let joinWhere;
    /* Attributes for the left side */
    const left = association.source;
    const attrLeft = association instanceof BelongsTo ?
      association.identifier :
      association.sourceKeyAttribute || left.primaryKeyAttribute;
    const fieldLeft = association instanceof BelongsTo ?
      association.identifierField :
      left.rawAttributes[association.sourceKeyAttribute || left.primaryKeyAttribute].field;
    let asLeft;
    /* Attributes for the right side */
    const right = include.model;
    const tableRight = right.getTableName();
    const fieldRight = association instanceof BelongsTo ?
      right.rawAttributes[association.targetIdentifier || right.primaryKeyAttribute].field :
      association.identifierField;
    let asRight = include.as;

    while (($parent = $parent && $parent.parent || include.parent) && $parent.association) {
      if (asLeft) {
        asLeft = `${$parent.as}->${asLeft}`;
      } else {
        asLeft = $parent.as;
      }
    }

    if (!asLeft) asLeft = parent.as || parent.model.name;
    else asRight = `${asLeft}->${asRight}`;

    let joinOn = `${this.quoteIdentifier(asLeft)}.${fieldLeft}`;
    const subqueryAttributes = [];

    if (topLevelInfo.options.groupedLimit && parentIsTop || topLevelInfo.subQuery && include.parent.subQuery && !include.subQuery) {
      if (parentIsTop) {
        // The main model attributes is not aliased to a prefix
        const tableName = this.quoteTable(parent.as || parent.model.name);

        // Check for potential aliased JOIN condition
        joinOn = this._getAliasForField(tableName, attrLeft, topLevelInfo.options) || `${this.quoteIdentifier(tableName)}.${attrLeft}`;

        if (topLevelInfo.subQuery) {
          const dbIdentifier = `${this.quoteIdentifier(tableName)}.${fieldLeft}`;
          subqueryAttributes.push(dbIdentifier !== joinOn ? `${dbIdentifier} AS ${this.quoteIdentifier(attrLeft)}` : dbIdentifier);
        }
      } else {
        const joinSource = `${asLeft.replace(/->/g, '.')}.${attrLeft}`;

        // Check for potential aliased JOIN condition
        joinOn = this._getAliasForField(asLeft, joinSource, topLevelInfo.options) || this.quoteIdentifier(joinSource);
      }
    }

    joinOn += ` = ${this.quoteIdentifier(asRight)}.${fieldRight}`;

    if (include.on) {
      joinOn = this.whereItemsQuery(include.on, {
        prefix: this.sequelize.literal(this.quoteIdentifier(asRight)),
        model: include.model
      });
    }

    if (include.where) {
      joinWhere = this.whereItemsQuery(include.where, {
        prefix: this.sequelize.literal(this.quoteIdentifier(asRight)),
        model: include.model
      });
      if (joinWhere) {
        if (include.or) {
          joinOn += ` OR ${joinWhere}`;
        } else {
          joinOn += ` AND ${joinWhere}`;
        }
      }
    }

    if (this.options.minifyAliases && asRight.length > 63) {
      const alias = `%${topLevelInfo.options.includeAliases.size}`;

      topLevelInfo.options.includeAliases.set(alias, asRight);
    }

    return {
      join: include.required ? 'INNER JOIN' : include.right && this._dialect.supports['RIGHT JOIN'] ? 'RIGHT OUTER JOIN' : 'LEFT OUTER JOIN',
      body: this.quoteTable(tableRight, asRight),
      condition: joinOn,
      attributes: {
        main: [],
        subQuery: subqueryAttributes
      }
    };
  }

  generateThroughJoin(include, includeAs, parentTableName, topLevelInfo) {
    const through = include.through;
    const throughTable = through.model.getTableName();
    const throughAs = `${includeAs.internalAs}->${through.as}`;
    const externalThroughAs = `${includeAs.externalAs}.${through.as}`;
    const throughAttributes = through.attributes.map(attr => {
      let alias = `${externalThroughAs}.${Array.isArray(attr) ? attr[1] : attr}`;

      if (this.options.minifyAliases) {
        alias = this._getMinifiedAlias(alias, throughAs, topLevelInfo.options);
      }

      return Utils.joinSQLFragments([
        `${this.quoteIdentifier(throughAs)}.${Array.isArray(attr) ? attr[0] : attr}`,
        'AS',
        this.quoteIdentifier(alias)
      ]);
    });
    const association = include.association;
    const parentIsTop = !include.parent.association && include.parent.model.name === topLevelInfo.options.model.name;
    const tableSource = parentTableName;
    const identSource = association.identifierField;
    const tableTarget = includeAs.internalAs;
    const identTarget = association.foreignIdentifierField;
    const attrTarget = association.targetKeyField;

    const joinType = include.required ? 'INNER JOIN' : include.right && this._dialect.supports['RIGHT JOIN'] ? 'RIGHT OUTER JOIN' : 'LEFT OUTER JOIN';
    let joinBody;
    let joinCondition;
    const attributes = {
      main: [],
      subQuery: []
    };
    let attrSource = association.sourceKey;
    let sourceJoinOn;
    let targetJoinOn;
    let throughWhere;
    let targetWhere;

    if (topLevelInfo.options.includeIgnoreAttributes !== false) {
      // Through includes are always hasMany, so we need to add the attributes to the mainAttributes no matter what (Real join will never be executed in subquery)
      for (const attr of throughAttributes) {
        attributes.main.push(attr);
      }
    }

    // Figure out if we need to use field or attribute
    if (!topLevelInfo.subQuery) {
      attrSource = association.sourceKeyField;
    }
    if (topLevelInfo.subQuery && !include.subQuery && !include.parent.subQuery && include.parent.model !== topLevelInfo.options.mainModel) {
      attrSource = association.sourceKeyField;
    }

    // Filter statement for left side of through
    // Used by both join and subquery where
    // If parent include was in a subquery need to join on the aliased attribute
    if (topLevelInfo.subQuery && !include.subQuery && include.parent.subQuery && !parentIsTop) {
      // If we are minifying aliases and our JOIN target has been minified, we need to use the alias instead of the original column name
      const joinSource = this._getAliasForField(tableSource, `${tableSource}.${attrSource}`, topLevelInfo.options) || `${tableSource}.${attrSource}`;

      sourceJoinOn = `${this.quoteIdentifier(joinSource)} = `;
    } else {
      // If we are minifying aliases and our JOIN target has been minified, we need to use the alias instead of the original column name
      const aliasedSource = this._getAliasForField(tableSource, attrSource, topLevelInfo.options) || attrSource;

      sourceJoinOn = `${this.quoteTable(tableSource)}.${topLevelInfo.subQuery ? this.quoteIdentifier(aliasedSource) : aliasedSource} = `;
    }
    sourceJoinOn += `${this.quoteIdentifier(throughAs)}.${identSource}`;

    // Filter statement for right side of through
    // Used by both join and subquery where
    targetJoinOn = `${this.quoteIdentifier(tableTarget)}.${attrTarget} = `;
    targetJoinOn += `${this.quoteIdentifier(throughAs)}.${identTarget}`;

    if (through.where) {
      throughWhere = this.getWhereConditions(through.where, this.sequelize.literal(this.quoteIdentifier(throughAs)), through.model);
    }

    // Generate a wrapped join so that the through table join can be dependent on the target join
    joinBody = `( ${this.quoteTable(throughTable, throughAs)} INNER JOIN ${this.quoteTable(include.model.getTableName(), includeAs.internalAs)} ON ${targetJoinOn}`;
    if (throughWhere) {
      joinBody += ` AND ${throughWhere}`;
    }
    joinBody += ')';
    joinCondition = sourceJoinOn;

    if (include.where || include.through.where) {
      if (include.where) {
        targetWhere = this.getWhereConditions(include.where, this.sequelize.literal(this.quoteIdentifier(includeAs.internalAs)), include.model, topLevelInfo.options);
        if (targetWhere) {
          joinCondition += ` AND ${targetWhere}`;
        }
      }
    }

    this._generateSubQueryFilter(include, includeAs, topLevelInfo);

    return {
      join: joinType,
      body: joinBody,
      condition: joinCondition,
      attributes
    };
  }
}

// private methods
function wrapSingleQuote(identifier) {
  return Utils.addTicks(identifier, '\'');
}

module.exports = DMDBQueryGenerator;
