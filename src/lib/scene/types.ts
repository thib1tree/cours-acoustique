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

export interface SceneSpec {
  readonly id: string;
  readonly params: readonly ParamSpec[];
  readonly terms?: readonly TermSpec[];
  readonly views?: readonly ViewSpec[];
}
