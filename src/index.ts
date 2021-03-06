import { merge } from "lodash";

enum DirectiveType {
  Begin = 0,
  End = 1,
  Assign = 2,
  Merge = 3,
  Emit = 4,
}

type Directive = BeginDirective | EndDirective | AssignDirective | MergeDirective | EmitDirective;

interface BeginDirective {
  readonly type: DirectiveType.Begin;
  readonly arg: null;
  readonly padding: string;
  readonly start: number;
  readonly end: number;
}

interface EndDirective {
  readonly type: DirectiveType.End;
  readonly arg: null;
  readonly padding: string;
  readonly start: number;
  readonly end: number;
}

interface AssignDirective {
  readonly type: DirectiveType.Assign;
  readonly arg: {};
  readonly padding: string;
  readonly start: number;
  readonly end: number;
}

interface MergeDirective {
  readonly type: DirectiveType.Merge;
  readonly arg: {};
  readonly padding: string;
  readonly start: number;
  readonly end: number;
}

interface EmitDirective {
  readonly type: DirectiveType.Emit;
  readonly arg: any[];
  readonly padding: string;
  readonly start: number;
  readonly end: number;
}

export interface InjectableRegion {
  readonly args: any[];
  readonly data: {};
  readonly padding: string;
  readonly start: number;
  readonly end: number;
}

export interface SourcePosition {
  line: number;
  col: number;
}

export abstract class InvalidSourceError extends Error {
  position: SourcePosition | null;

  constructor(message: string, position: SourcePosition | null = null) {
    super(message);
    this.position = position;
  }

  setPosition(position: SourcePosition): void {
    this.position = position;
    this.message = `${positionToString(this.position)} ${this.message}`;
  }
}

export class InvalidDirectiveError extends InvalidSourceError { }
export class InvalidRegionError extends InvalidSourceError { }

export function createDirectiveMatcher(prefix: string): RegExp {
  return new RegExp(`^[ \t]*(\/\/\\s+${prefix}:(.+))$`, "gm");
}

export function extractRegions(text: string, directiveMatcher: RegExp, data = {}): InjectableRegion[] {
  const regions: InjectableRegion[] = [];
  enterScope(text, regions, extractDirectives(directiveMatcher, text), 0, 0, data);
  return regions;
}

export function inject(
  text: string,
  directiveMatcher: RegExp,
  cb: (region: InjectableRegion) => string,
  data = {},
): string {
  let r = "";
  let start = 0;
  for (const region of extractRegions(text, directiveMatcher)) {
    r += text.substring(start, region.start);
    r += ensureStringStartsWithNewline(ensureStringEndsWithNewline(cb(region)));
    start = region.end;
  }
  return r += text.substring(start);
}

function directiveTypeFromString(s: string): DirectiveType {
  switch (s) {
    case "begin":
      return DirectiveType.Begin;
    case "end":
      return DirectiveType.End;
    case "assign":
      return DirectiveType.Assign;
    case "merge":
      return DirectiveType.Merge;
    case "emit":
      return DirectiveType.Emit;
  }
  throw new InvalidDirectiveError(`Invalid directive type: ${s}.`);
}

function parseDirective(s: string): { type: DirectiveType, arg: {} | null } {
  const pStart = s.indexOf("(");
  if (pStart !== -1) {
    const type = directiveTypeFromString(s.substring(0, pStart));
    switch (type) {
      case DirectiveType.Begin:
      case DirectiveType.End:
        throw new InvalidDirectiveError(
          `Invalid directive. ${DirectiveType[type]} directive should not have arguments.`,
        );
    }
    const pEnd = s.lastIndexOf(")");
    if (pEnd === -1) {
      throw new InvalidDirectiveError(
        `Invalid directive. Unable to find closing parenthesis in a directive "${s}".`,
      );
    }
    const sArg = s.substring(pStart + 1, pEnd);
    let arg;
    switch (type) {
      case DirectiveType.Assign:
      case DirectiveType.Merge:
        try {
          arg = JSON.parse(sArg);
        } catch {
          throw new InvalidDirectiveError(
            `Invalid directive. Unable to parse(JSON.parse) directive argument "${sArg}".`,
          );
        }

        if (typeof arg !== "object" || arg === null) {
          throw new InvalidDirectiveError(
            `Invalid ${DirectiveType[type]} directive. Argument should have an object type.`,
          );
        }
        break;
      case DirectiveType.Emit:
        try {
          arg = JSON.parse(`[${sArg}]`);
        } catch {
          throw new InvalidDirectiveError(
            `Invalid directive. Unable to parse(JSON.parse) directive argument "[${sArg}]".`,
          );
        }
        break;
    }
    return { type, arg };
  } else {
    const type = directiveTypeFromString(s);
    switch (type) {
      case DirectiveType.Assign:
      case DirectiveType.Merge:
      case DirectiveType.Emit:
        throw new InvalidDirectiveError(
          `Invalid directive. ${DirectiveType[type]} directive should have arguments.`,
        );
    }
    return { type, arg: null };
  }
}

function extractDirectives(directiveMatcher: RegExp, text: string): Directive[] {
  const directives: Directive[] = [];
  let match;
  while ((match = directiveMatcher.exec(text)) !== null) {
    const fullMatch = match[0];
    const start = match.index;
    const end = start + fullMatch.length;
    const comment = match[1];
    let directive;
    try {
      directive = parseDirective(match[2]);
    } catch (e) {
      if (e instanceof InvalidSourceError) {
        e.setPosition(positionFromOffset(text, start));
      }
      throw e;
    }
    const padding = fullMatch.substring(0, fullMatch.length - comment.length);

    directives.push({
      type: directive.type,
      arg: directive.arg,
      padding,
      start,
      end,
    } as Directive);
  }

  return directives;
}

function enterEmit(
  text: string,
  regions: InjectableRegion[],
  directives: Directive[],
  index: number,
  data: {},
  args: string[],
  padding: string,
  start: number,
): number {
  while (index < directives.length) {
    const directive = directives[index++];
    switch (directive.type) {
      case DirectiveType.End:
        regions.push({ args, data, padding, start, end: directive.start });
        return index;
      default:
        throw new InvalidRegionError(
          "Emit region should not contain any directives",
          positionFromOffset(text, directive.start),
        );
    }
  }
  throw new InvalidRegionError(
    "Emit region should end with End directive",
    positionFromOffset(text, start),
  );
}

function enterScope(
  text: string,
  regions: InjectableRegion[],
  directives: Directive[],
  index: number,
  scopes: number,
  data: {},
): number {
  while (index < directives.length) {
    const directive = directives[index++];
    switch (directive.type) {
      case DirectiveType.Begin:
        index = enterScope(text, regions, directives, index, scopes + 1, data);
        break;
      case DirectiveType.End:
        return index;
      case DirectiveType.Assign:
        data = { ...data, ...directive.arg };
        break;
      case DirectiveType.Merge:
        data = merge({}, data, directive.arg);
        break;
      case DirectiveType.Emit:
        index = enterEmit(
          text,
          regions,
          directives,
          index,
          data,
          directive.arg,
          directive.padding,
          directive.end,
        );
        break;
    }
  }
  if (scopes > 0) {
    throw new InvalidRegionError(`All scopes should end with End directive.`);
  }
  return index;
}

function positionFromOffset(s: string, offset: number): SourcePosition {
  if (offset > s.length) {
    throw new Error("Invalid offset. Offset is pointing outside of text.");
  }
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset; i++) {
    const c = s.charCodeAt(i);
    if (c === 10) { // \n
      line++;
      col = 1;
    } else {
      col++;
    }
  }

  return { line, col };
}

function positionToString(pos: SourcePosition): string {
  return `[${pos.line}:${pos.col}]`;
}

function ensureStringStartsWithNewline(s: string): string {
  if (s.length === 0) {
    return "\n";
  }
  if (s.charCodeAt(0) !== 10) { // \n
    return "\n" + s;
  }
  return s;
}

function ensureStringEndsWithNewline(s: string): string {
  if (s.length === 0) {
    return "\n";
  }
  if (s.charCodeAt(s.length - 1) !== 10) { // \n
    return s + "\n";
  }
  return s;
}
