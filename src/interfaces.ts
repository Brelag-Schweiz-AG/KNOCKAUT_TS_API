import { AxiosRequestConfig } from 'axios'
import { WebSocketMessageType } from './constants'

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

// Connection options to Knockaut Backend
export interface ApiOptions {
  host: string
  password?: string
  username?: string
  skin?: string
}

// Connection options to Knockaut Backend
export interface ApiCredentials {
  password: string
  username?: string
}

// Configuration for WebSocket Connection
export interface WebSocketOptions {
  baseUrl: string
  specificUrl: string
  autoConnect?: boolean
  reconnection?: boolean
  format?: string
  reconnectionAttempts?: number
  reconnectionDelay?: number
  protocol?: string[]
}

export interface WebSocketMessage {
  Message: WebSocketMessageType
  Data: (string | number | boolean)[]
  SenderID: number
  TimeStamp: number
}

// Custom listener for WebSocket actions
export interface WebSocketListener {
  onclose: (ev: CloseEvent) => any
  onerror: (ev: Event) => any
  onmessage: (ev: MessageEvent) => any
  onopen: (ev: Event) => any
  reconnect: (count: number) => any
  reconnectError: () => any
  onFilteredMessage?: (
    messageType: WebSocketMessageType,
    message: WebSocketMessage
  ) => void
  acceptedMessageTypes?: WebSocketMessageType[]
}

export interface SnapshotObject {
  data: any
  disabled: boolean
  hidden: boolean
  icon: string
  ident: string
  info: string
  name: string
  parentID: number
  position: number
  readOnly: boolean
  summary: string
  type: number
}

export interface WFCExecute {
  actionID: number
  targetID: number
  value: number | boolean | string
}

export interface FooterVariable {
  id: number
  name: string
}
