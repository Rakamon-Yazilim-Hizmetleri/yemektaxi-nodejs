import winston from "winston";
import util from "util";
type AbstractConfigSetLevels = any;
type Arguments = { [key: string]: any };

const myCustomLevels = {
  levels: {
    // These are the defaults: https://github.com/winstonjs/winston#logging-levels
    error: 0,
    warn: 1,
    info: 2,
    // http: 3,
    success: 3, // 'success' is a custom level replacing 'http'.
    verbose: 4,
    debug: 5,
    silly: 6,
  },
  colors: {
    // https://github.com/winstonjs/winston#using-custom-logging-levels
    error: "bold red",
    warn: "italic yellow",
    info: "cyan",
    debug: "magenta",
    silly: "gray",
    success: "bold green",
  },
};

const colorizerOptions = { level: true, message: false };
const colorizer = winston.format.colorize(colorizerOptions);

function getArgumentsPreserved(providedArguments: Arguments): string {
  if (Object.keys(providedArguments).length > 0) {
    const copied = Object.fromEntries(Object.entries(providedArguments));

    return util.inspect(copied, {
      colors: true,
      depth: null,
      showHidden: false,
    });
  } else {
    return "";
  }
}

const simpleConsoleLogging = winston.format.combine(
  // Simple console logging for local environment.
  winston.format.timestamp(),
  winston.format.printf((info) => {
    const { level, message, timestamp, ...rest } = info;
    const coloredTimestampAndLevel = colorizer.colorize(
      level,
      `${level.toUpperCase()}`,
    );

    const syntaxHighlightedObjects = getArgumentsPreserved(rest); // https://stackoverflow.com/questions/74186705/how-to-preserve-default-syntax-highlighting-colors-in-javascript-console

    return `[${coloredTimestampAndLevel}]: ${message} ${syntaxHighlightedObjects}`; // https://github.com/winstonjs/winston/issues/1388#issuecomment-432932959
  }),
);

function getMaxLevelName(levels: AbstractConfigSetLevels): string {
  let maxLevel = 0;
  let maxLevelName = "";
  for (const level of Object.keys(levels)) {
    if (levels[level] > maxLevel) {
      maxLevel = levels[level];
      maxLevelName = level;
    }
  }

  return maxLevelName;
}

const transports: any = [];

transports.push(
  new winston.transports.Console({
    format: simpleConsoleLogging,
    level: getMaxLevelName(myCustomLevels.levels),
  }),
);

export const logger = winston.createLogger({
  levels: myCustomLevels.levels,
  format: simpleConsoleLogging,
  // defaultMeta: { service: 'user-service' },
  transports,
}) as Record<keyof typeof myCustomLevels.levels, winston.LeveledLogMethod> &
  winston.Logger; // https://stackoverflow.com/a/53298622/

winston.addColors(myCustomLevels.colors); // https://github.com/winstonjs/winston#using-custom-logging-levels

/** EXAMPLES */
// logger.silly("silly, not important");
// logger.warn("warning");
// logger.success("demo", ["hooray", "yay!"]);
// logger.error("test error", {
//   abc: 123,
//   def: "wow",
//   innerObj: { very: "deep" },
// });
