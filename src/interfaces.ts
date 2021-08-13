export enum SymconModuleType {
  CORE = 0,
  I_O = 1,
  SPLITTER = 2,
  DEVICE = 3,
  CONFIGURATOR = 4,
  DISCOVERY = 5,
  VISUALIZER = 6,
}

export interface SymconModule {
  Aliases: string[]
  ChildRequirements: string[]
  Implemented: string[]
  LibraryID: string
  ModuleID: string
  ModuleName: string
  ModuleType: SymconModuleType
  ParentRequirements: string[]
  URL: string
  Vendor: string
}

export interface SymconLibrary {
  LibraryID: string
  Author: string
  URL: string
  Name: string
  Version: number
  Build: number
  Date: number
}
