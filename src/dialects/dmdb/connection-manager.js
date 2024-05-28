'use strict';

const AbstractConnectionManager = require('../abstract/connection-manager');
const SequelizeErrors = require('../../errors');
const { logger } = require('../../utils/logger');
const DataTypes = require('../../data-types').dmdb;
const debug = logger.debugContext('connection:dmdb');
const parserStore = require('../parserStore')('dmdb');
const { promisify } = require('util');

/**
 * DMDB Connection Manager
 *
 * Get connections, validate and disconnect them.
 * AbstractConnectionManager pooling use it to handle DMDB specific connections
 * Use https://www.npmjs.com/package/dmdb to connect with DMDB server
 *
 * @private
 */
class ConnectionManager extends AbstractConnectionManager {
  constructor(dialect, sequelize) {
    sequelize.config.port = sequelize.config.port || 5236;
    super(dialect, sequelize);
    this.lib = this._loadDialectModule('dmdb');
    this.lib.fetchAsString = [this.lib.CLOB];
    this.refreshTypeParser(DataTypes);
  }

  _refreshTypeParser(dataType) {
    parserStore.refresh(dataType);
  }

  _clearTypeParser() {
    parserStore.clear();
  }

  static _typecast(field, next) {
    if (parserStore.get(field.type)) {
      return parserStore.get(field.type)(field, this.sequelize.options, next);
    }
    return next();
  }

  /**
   * Connect with MySQL database based on config, Handle any errors in connection
   * Set the pool handlers on connection.error
   * Also set proper timezone once connection is connected.
   *
   * @param {object} config
   * @returns {Promise<Connection>}
   * @private
   */
  async connect(config) {
    const connectionConfig = {
      connectString: `${config.host}:${config.port}`,
      user: config.username,
      password: config.password,
      schema: config.database,
      timezone: this.sequelize.options.timezone,
      typeCast: ConnectionManager._typecast.bind(this),
      bigNumberStrings: false,
      supportBigNumbers: true,
      ...config.dialectOptions
    };

    try {
      const connection = await new Promise((resolve, reject) => {
        this.lib.getConnection(connectionConfig, (err, conn) => {
          const errorHandler = e => {
            // clean up connect & error event if there is error
            conn.removeListener('connect', connectHandler);
            conn.removeListener('error', connectHandler);
            reject(e);
          };

          const connectHandler = () => {
            // clean up error event if connected
            conn.removeListener('error', errorHandler);
            resolve(conn);
          };

          conn.on('error', errorHandler);
          conn.once('connect', connectHandler);
          if (err) return errorHandler(err);
          connectHandler();
        });
      });

      debug('connection acquired');
      connection.on('error', error => {
        switch (error.code) {
          case 'ESOCKET':
          case 'ECONNRESET':
          case 'EPIPE':
          case 'PROTOCOL_CONNECTION_LOST':
            this.pool.destroy(connection);
        }
      });

      // if (!this.sequelize.config.keepDefaultTimezone) {
      //   // set timezone for this connection
      //   // but named timezone are not directly supported in mysql, so get its offset first
      //   let tzOffset = this.sequelize.options.timezone;
      //   tzOffset = /\//.test(tzOffset) ? momentTz.tz(tzOffset).format('Z') : tzOffset;
      //   await promisify(cb => connection.query(`SET time_zone = '${tzOffset}'`, cb))();
      // }

      return connection;
    } catch (err) {
      switch (err.code) {
        case 'ECONNREFUSED':
          throw new SequelizeErrors.ConnectionRefusedError(err);
        case 'ER_ACCESS_DENIED_ERROR':
          throw new SequelizeErrors.AccessDeniedError(err);
        case 'ENOTFOUND':
          throw new SequelizeErrors.HostNotFoundError(err);
        case 'EHOSTUNREACH':
          throw new SequelizeErrors.HostNotReachableError(err);
        case 'EINVAL':
          throw new SequelizeErrors.InvalidConnectionError(err);
        default:
          throw new SequelizeErrors.ConnectionError(err);
      }
    }
  }

  async disconnect(connection) {
    // Don't disconnect connections with CLOSED state
    if (connection._closing) {
      debug('connection tried to disconnect but was already at CLOSED state');
      return;
    }

    return await promisify(callback => connection.close(callback))();
  }

  validate(connection) {
    return connection
      && !connection._fatalError
      && !connection._protocolError
      && !connection.closed;
  }
}

module.exports = ConnectionManager;
module.exports.ConnectionManager = ConnectionManager;
module.exports.default = ConnectionManager;
