import * as winston from "winston";
import { ColorConsole } from "./ColorConsole";
import { TestLogger } from "./testLogger";

const level = process.env.LOG_LEVEL || "info";
const silent = process.env.LOG_SILENT === "true";

export const Reset = "\x1b[0m";
const Bright = "\x1b[1m";
const Dim = "\x1b[2m";
const Underscore = "\x1b[4m";
const Blink = "\x1b[5m";
const Reverse = "\x1b[7m";
const Hidden = "\x1b[8m";

export const FgBlack = "\x1b[30m";
export const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
export const FgYellow = "\x1b[33m";
export const FgBlue = "\x1b[34m";
const FgMagenta = "\x1b[35m";
const FgCyan = "\x1b[36m";
export const FgWhite = "\x1b[37m";
const FgGray = "\x1b[90m";

const BgBlack = "\x1b[40m";
export const BgRed = "\x1b[41m";
const BgGreen = "\x1b[42m";
const BgYellow = "\x1b[43m";
export const BgBlue = "\x1b[44m";
const BgMagenta = "\x1b[45m";
const BgCyan = "\x1b[46m";
export const BgWhite = "\x1b[47m";
export const BgGray = "\x1b[100m";

function replaceAll(text: string, search: string, replaceWith: string): string {
  try {
    while (text.indexOf(search) >= 0) {
      text = text.replace(search, replaceWith);
    }
  } catch {}

  return text;
}

const disableLogColors = process.env.DISABLE_COLOR_LOGS;

export function _color(color: string) {
  if( disableLogColors ) return "";

  return color;
}

export function processColors(text: string, def: string) {
  try {
    text = replaceAll(text, "^^", _color( Reset + def));
    text = replaceAll(text, "^R", _color( FgRed));
    text = replaceAll(text, "^G", _color( FgGreen));
    text = replaceAll(text, "^B", _color( FgBlue));
    text = replaceAll(text, "^Y", _color( FgYellow));
    text = replaceAll(text, "^C", _color( FgCyan));
    text = replaceAll(text, "^W", _color( FgWhite));
    text = replaceAll(text, "^K", _color( FgBlack));
    text = replaceAll(text, "^E", _color( FgGray));

    text = replaceAll(text, "^r", _color(BgRed));
    text = replaceAll(text, "^g", _color(BgGreen));
    text = replaceAll(text, "^b", _color(BgBlue));
    text = replaceAll(text, "^y", _color(BgYellow));
    text = replaceAll(text, "^c", _color(BgCyan));
    text = replaceAll(text, "^w", _color(BgWhite));
    text = replaceAll(text, "^e", _color(BgGray));
  } catch {}

  return text;
}

const myCustomLevels = {
  levels: {
    debug3: 103, // not displayed on console but logged
    debug2: 102,
    debug1: 101,
    debug: 100, // all above are filtered out when level is set to debug
    title: 80,
    group: 70,
    event: 50,
    info: 40,
    note: 39,
    warning: 20,
    error: 10,
    error2: 9,
    exception: 5,

    critical: 2,
    alert: 1,
  },
};

const globalLogger = new Map<string, AttLogger>();

let globalTestLogger: AttLogger = null;

let globalLoggerLabel;
let loggerName = "log";

export interface AttLogger extends winston.Logger {
  title: (message: string) => null;
  group: (message: string) => null;
  event: (message: string) => null;
  note: (message: string) => null;
  error2: (message: string) => null;
  exception: (message: string) => null;

  critical: (message: string) => null;
  debug1: (message: string) => null;
  debug2: (message: string) => null;
  debug3: (message: string) => null;
}

function createLogger(label?: string, test = false): AttLogger {
  let logPath = "./logs/";

  if (process.env.LOG_PATH) {
    logPath = `${process.env.LOG_PATH}/`;
  }

  const logFilename = `${logPath}${loggerName}-${label}.log`;

  return winston.createLogger({
    level: "debug3",
    levels: myCustomLevels.levels,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.label({
        label,
      }),
      winston.format.printf((json: any) => {
        if (json.label) {
          return `${json.timestamp}  - ${json.label}:[${json.level}]: ${json.message}`;
        } else {
          return `${json.timestamp}[${json.level}]: ${json.message}`;
        }
      })
    ),
    transports: [
      test ? new TestLogger() : new ColorConsole(),
      new winston.transports.File({
        level: "debug2",
        filename: logFilename,
      }),
    ],
    silent,
  }) as AttLogger;
}

export function setLoggerName(name: string) {
  loggerName = name;
}

export function setGlobalLoggerLabel(label: string) {
  globalLoggerLabel = label;
}

export function initializeTestGlobalLogger() {
  if (globalLogger.size || globalTestLogger) {
    // console.error("initializeTestGlobalLogger must be called before any logger is created");
    // process.exit(3);
  }

  globalTestLogger = createLogger("@test", true);

  return globalTestLogger;
}

// return one instance of logger
export function getGlobalLogger(label?: string): AttLogger {
  if (globalTestLogger) return globalTestLogger;

  if (!label) {
    label = globalLoggerLabel;
  }

  if (!label) {
    label = "global";
  }

  let logger = globalLogger.get(label);

  if (!logger) {
    logger = createLogger(label);
    globalLogger.set(label, logger);
  }

  return logger;
}

export function logException(error: any, comment: string, attLogger?: AttLogger) {
  const logger = attLogger ?? getGlobalLogger();

  logger.error2(`${comment} ${error}`);
  if (error.stack) {
    logger.error(error.stack);
  }
}
