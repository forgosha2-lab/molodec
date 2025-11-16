import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

let SQL;
const dbInstances = new Map();
const SAVE_DEBOUNCE_MS = 100;

export async function initializeDb(dbPath) {
  try {
    if (!SQL) {
      SQL = await initSqlJs();
    }
    
    if (dbInstances.has(dbPath)) {
      return dbInstances.get(dbPath).api;
    }
    
    let buffer;
    if (existsSync(dbPath)) {
      try {
        buffer = readFileSync(dbPath);
      } catch (error) {
        console.error(`Failed to read database file at ${dbPath}:`, error);
        throw new Error(`Cannot read database file: ${error.message}`);
      }
    }
    
    const dbInstance = new SQL.Database(buffer);
    
    const instanceData = {
      dbInstance,
      saveTimeout: null,
      api: null
    };
    
    const debouncedSave = () => {
      if (instanceData.saveTimeout) {
        clearTimeout(instanceData.saveTimeout);
      }
      instanceData.saveTimeout = setTimeout(() => {
        saveDatabaseSync(dbPath, dbInstance);
      }, SAVE_DEBOUNCE_MS);
    };
    
    instanceData.api = {
      exec: (sql) => {
        try {
          dbInstance.exec(sql);
          saveDatabaseSync(dbPath, dbInstance);
          return true;
        } catch (error) {
          console.error('SQL exec error:', error);
          throw error;
        }
      },
      prepare: (sql) => {
        return {
          run: (...params) => {
            try {
              const stmt = dbInstance.prepare(sql);
              stmt.bind(params);
              stmt.step();
              stmt.free();
              debouncedSave();
            } catch (error) {
              console.error('SQL run error:', error);
              throw error;
            }
          },
          get: (...params) => {
            try {
              const stmt = dbInstance.prepare(sql);
              stmt.bind(params);
              const result = stmt.step() ? stmt.getAsObject() : null;
              stmt.free();
              return result;
            } catch (error) {
              console.error('SQL get error:', error);
              throw error;
            }
          },
          all: (...params) => {
            try {
              const stmt = dbInstance.prepare(sql);
              if (params.length > 0) {
                stmt.bind(params);
              }
              const results = [];
              while (stmt.step()) {
                results.push(stmt.getAsObject());
              }
              stmt.free();
              return results;
            } catch (error) {
              console.error('SQL all error:', error);
              throw error;
            }
          }
        };
      },
      close: () => {
        if (instanceData.saveTimeout) {
          clearTimeout(instanceData.saveTimeout);
        }
        saveDatabaseSync(dbPath, dbInstance);
        dbInstance.close();
        dbInstances.delete(dbPath);
      }
    };
    
    dbInstances.set(dbPath, instanceData);
    return instanceData.api;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error.message}`);
  }
}

function saveDatabaseSync(dbPath, dbInstance) {
  try {
    const data = dbInstance.export();
    writeFileSync(dbPath, data);
  } catch (error) {
    console.error(`Failed to save database to ${dbPath}:`, error);
    throw new Error(`Database save failed: ${error.message}`);
  }
}

process.on('SIGINT', () => {
  console.log('Shutting down, saving databases...');
  for (const instanceData of dbInstances.values()) {
    try {
      instanceData.api.close();
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Shutting down, saving databases...');
  for (const instanceData of dbInstances.values()) {
    try {
      instanceData.api.close();
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
  process.exit();
});
