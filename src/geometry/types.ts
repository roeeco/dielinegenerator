export type PathKind = 'cut' | 'crease' | 'partial' | 'perforation' | 'tear';
export type Point = readonly [number, number];
export type Bounds = { x: number; y: number; width: number; height: number };
export type GeometryPath = {
  kind: PathKind;
  partId: string;
  d: string;
  points: Point[];
  closed: boolean;
};
export type Part = { id: string; nameHe: string; boundsMm: Bounds };
export type ValidationIssue = { severity: 'error' | 'warning'; message: string; field?: string };
export type DielineGeometry = {
  parts: Part[];
  paths: GeometryPath[];
  boundsMm: Bounds;
  warnings: ValidationIssue[];
};
export type Params = Record<string, number>;
export type ParameterField = {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step: number;
  group: 'dimension' | 'special' | 'material';
  unit?: string;
  help?: string;
};
export type GeneratorDefinition = {
  id: string;
  fields: ParameterField[];
  notes: string[];
  generate: (params: Params) => DielineGeometry;
  validate?: (params: Params) => ValidationIssue[];
};
