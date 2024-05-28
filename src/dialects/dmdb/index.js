'use strict';

const _ = require('lodash');
const AbstractDialect = require('../abstract');
const ConnectionManager = require('./connection-manager');
const Query = require('./query');
const QueryGenerator = require('./query-generator');
const DataTypes = require('../../data-types').dmdb;
const { DMDBQueryInterface } = require('./query-interface');

class DmdbDialect extends AbstractDialect {
  constructor(sequelize) {
    super();
    this.sequelize = sequelize;
    this.connectionManager = new ConnectionManager(this, sequelize);
    this.queryGenerator = new QueryGenerator({
      _dialect: this,
      sequelize
    });
    this.queryInterface = new DMDBQueryInterface(
      sequelize,
      this.queryGenerator
    );
  }
}

DmdbDialect.prototype.supports = _.merge(
  _.cloneDeep(AbstractDialect.prototype.supports),
  {
    'VALUES ()': true,
    'LIMIT ON UPDATE': true,
    lock: true,
    forShare: 'LOCK IN SHARE MODE',
    settingIsolationLevelDuringTransaction: false,
    inserts: {
      ignoreDuplicates: false,
      updateOnDuplicate: false
    },
    schemas: true,
    returnValues: false,
    autoIncrement: {
      identityInsert: true,
      defaultValue: false,
      update: false
    },
    index: {
      collate: false,
      length: true,
      parser: false,
      type: false
    },
    constraints: {
      dropConstraint: false,
      check: false
    },
    indexViaAlter: false,
    indexHints: true,
    NUMERIC: true,
    GEOMETRY: true,
    JSON: true,
    REGEXP: true
  }
);

DmdbDialect.prototype.defaultVersion = '8.0.0'; // minimum supported version
DmdbDialect.prototype.Query = Query;
DmdbDialect.prototype.QueryGenerator = QueryGenerator;
DmdbDialect.prototype.DataTypes = DataTypes;
DmdbDialect.prototype.name = 'dmdb';
DmdbDialect.prototype.TICK_CHAR = '"';
DmdbDialect.prototype.TICK_CHAR_LEFT = DmdbDialect.prototype.TICK_CHAR;
DmdbDialect.prototype.TICK_CHAR_RIGHT = DmdbDialect.prototype.TICK_CHAR;

module.exports = DmdbDialect;
