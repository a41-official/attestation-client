import Transport from "winston-transport";
import { round } from "../helpers/utils";
import { Terminal } from "../monitoring/Terminal";
import { BgBlue, BgGray, BgRed, BgWhite, FgBlack, FgBlue, FgRed, FgWhite, FgYellow, processColors, Reset, _color } from "./logger";

export class ColorConsole extends Transport {
  instance = 0;

  lastLog = "";
  lastLog2 = "";
  duplicate = 0;

  mode: "" | "sticky" | "forgettable" = "";

  terminal: Terminal;

  constructor() {
    super();

    this.terminal = new Terminal(process.stderr);
  }

  log = (info: any, callback: any) => {
    setImmediate(() => this.emit("logged", info));

    let color = "";

    let ignore = false;

    switch (info.level) {
      case "title":
        color = BgWhite + FgBlack;
        break;
      case "group":
        color = BgGray + FgBlack;
        break;
      case "info":
        color = "";
        break;
      case "error2":
        color = BgRed + FgWhite;
        break;
      case "error":
        color = FgRed;
        break;
      case "warning":
        color = FgYellow;
        break;
      case "debug":
        color = FgBlue;
        break;
      case "debug1":
        color = FgBlack + BgGray;
        break;
      case "debug2":
        color = FgBlack + BgGray;
        break;
      case "debug3":
        color = FgBlack + BgGray;
        ignore = true;
        break;
    }

    const memMb = round(process.memoryUsage().heapUsed / 1024 / 1024, 1);
    const mem = _color(BgBlue) + _color(FgBlack) + `${memMb.toFixed(1).padStart(6, " ")}` + _color(Reset);

    // const mem = "";
    if (!ignore && info.message) {
      let text = info.message.toString();

      if (text[0] === "*" || text[0] === "!") {
        text = text.substring(1);

        if (this.mode) {
          this.terminal.cursorRestore();
          this.terminal.clearLine();
        } else {
          this.terminal.cursorSave();
        }
        this.mode = text[0] === "*" ? "sticky" : "forgettable";
      } else {
        if (this.mode === "forgettable") {
          this.terminal.cursorRestore();
          this.terminal.clearLine();
        }

        this.mode = "";
      }

      if (this.lastLog === text) {
        this.duplicate++;
        process.stdout.write(
          "\r" + _color(BgGray + FgBlack) + info.timestamp.substring(11, 11 + 11) + _color(Reset) + mem + ` ` + _color(BgWhite + FgBlack) + ` ${this.duplicate} ` + _color(Reset)
        );
      } else if (this.lastLog2 === text) {
        this.duplicate++;
        process.stdout.write(
          "\r" + _color(BgGray + FgBlack) + info.timestamp.substring(11, 11 + 11) + _color(Reset + mem) + ` ` + _color(BgWhite + FgBlack) + ` ${this.duplicate}+ ` + _color(Reset)
        );
      } else {
        try {
          if (this.duplicate > 0) {
            console.log(``);
          }
          this.lastLog2 = this.lastLog;
          this.lastLog = text;
          this.duplicate = 0;

          //            |           |
          // "2022-01-10T13:13:07.712Z"
          console.log(_color(BgGray + FgBlack) + info.timestamp.substring(11, 11 + 11) + _color(Reset) + mem + ` ` + _color(color) + processColors(text, color) + _color(Reset));
        } catch {}
      }
    }

    if (callback) {
      callback();
    }
  };
}
