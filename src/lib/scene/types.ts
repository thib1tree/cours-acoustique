/** Declarative description of a scene: its parameters, switchable terms and views. */

export type Quantity = 'pressure' | 'velocity' | 'energy';

export interface ParamSpec {
  readonly key: string;
  /** LaTeX symbol shown next to the slider and inside live equations. */
  readonly symbol: string;
  /** Accessible name, in French. */
  readonly label: string;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  /** Fine step (arrow keys). */
  readonly step: number;
  /** Large step (Shift + arrows). Defaults to 10 × step. */
  readonly bigStep?: number;
  readonly default: number;
  readonly scale?: 'linear' | 'log';
  /** Number of decimals shown. */
  readonly digits?: number;
  /** Physical quantity the parameter controls: colors the slider. */
  readonly quantity?: Quantity;
}

export interface TermSpec {
  readonly key: string;
  readonly label: string;
  /** Can the reader switch this term off in the simulation? */
  readonly toggleable?: boolean;
}

export interface ViewSpec {
  readonly key: string;
  readonly label: string;
  readonly options: readonly { readonly key: string; readonly label: string }[];
  readonly default: string;
}

/** A quantity computed from the parameters, displayable with \val{key}. */
export interface DerivedSpec {
  readonly key: string;
  readonly digits?: number;
  readonly unit?: string;
  readonly fn: (
    params: Readonly<Record<string, number>>,
    terms: Readonly<Record<string, boolean>>,
    views: Readonly<Record<string, string>>,
  ) => number;
}

export interface SceneSpec {
  readonly id: string;
  readonly params: readonly ParamSpec[];
  readonly derived?: readonly DerivedSpec[];
  readonly terms?: readonly TermSpec[];
  readonly views?: readonly ViewSpec[];
}
