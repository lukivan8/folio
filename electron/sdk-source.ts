import { carbon } from "../src/design-system";
export const SDK_SOURCE = `export const SDK_VERSION = '1.0.0';
export const carbon = ${JSON.stringify(carbon)} as const;
export type Cell=string|number|boolean|null;
export interface SourceColumn{id:string;original:string;label:string;type:'text'|'number'|'date';missing:string[]}
export interface RuntimeSource{id:string;revision:string;columns:SourceColumn[];rows:string[][]}
export type ParameterValues=Record<string,string|number|boolean>;
export interface BlockContext{sources:RuntimeSource[];params:ParameterValues;state:unknown}
export interface ResultTable{columns:string[];rows:Cell[][];methodId:string;units?:string}
export interface AnalysisResult{datasets:Record<string,ResultTable>;inputRows:number;includedRows:number;excludedRows:number;warnings:string[];checks:{name:string;passed:boolean}[]}
export interface ViewProps{result:AnalysisResult;params:ParameterValues;setParams:(patch:Partial<ParameterValues>)=>void}
`;
