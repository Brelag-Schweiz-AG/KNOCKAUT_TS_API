// see https://stackoverflow.com/questions/38875401/getting-error-ts2304-cannot-find-name-buffer
declare const Buffer: any
import axios, { AxiosRequestConfig } from 'axios'
import { Store } from 'vuex'

const KnockautEndpoints = {
  GetConfigurators: 'WFC_GetConfigurators',
  GetSnapshot: 'WFC_GetSnapshot',
  Execute: 'WFC_Execute',

  KnockautAuthenticate: 'KNO_Authenticate',
  GetConfigurations: 'KNO_GetConfigurations',
  SetConfiguration: 'KNO_SetConfiguration',
  RunScene: 'KNO_RunScene',
  GetSceneConfig: 'KNO_GetSceneConfig',
  SyncScene: 'KNO_SyncScene',
  DeleteScene: 'KNO_DeleteScene',
  GetAlarms: 'KNO_GetAlarms',
  SyncAlarm: 'KNO_SyncAlarm',
  DeleteAlarm: 'KNO_DeleteAlarm',
  GetSnapshotObject: 'KNO_GetSnapshotObject',
  SyncEvent: 'KNO_SyncEvent',
  DeleteEvent: 'KNO_DeleteEvent',
  GetIconUrl: 'KNO_GetIconUrl',
  SyncFooterVars: 'KNO_SyncFooterVars',
  GetAppInfo: 'KNO_GetAppInfo',
  UpdateApp: 'KNO_UpdateApp',
}

// Connection options to Knockaut Backend
export interface ApiOptions {
  host: string
  password?: string
  username?: string
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

// Default values
const WebSocketOptionsDefaults: WebSocketOptions = {
  baseUrl: '',
  specificUrl: '',
  autoConnect: true,
  reconnection: true,
  format: 'json',
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  protocol: [],
}

// Custom listener for WebSocket actions
export interface WebSocketListener {
  onclose: (ev: CloseEvent) => any
  onerror: (ev: Event) => any
  onmessage: (ev: MessageEvent) => any
  onopen: (ev: Event) => any
  reconnect: (count: number) => any
  reconnectError: () => any
}

// Set of AxiosHeaders for different Authentication credentials
export interface KnockautHeaderConfigs {
  defaultApi: AxiosRequestConfig
  extendedApi: AxiosRequestConfig
}

const DefaultKnockautHeaderConfigs: KnockautHeaderConfigs = {
  defaultApi: {},
  extendedApi: {},
}

interface SnapshotObject {
  data: Object
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

interface WFCExecute {
  actionID: number
  targetID: number
  value: number | boolean | string
}

interface FooterVariable {
  id: number
  name: string
}

/**
 * ApiClient responsible for all communication to Knockaut Backend
 */
export class KnockautApiClient {
  private configs: KnockautHeaderConfigs = DefaultKnockautHeaderConfigs
  private host: string
  private wsOptions: WebSocketOptions
  private wsListener: WebSocketListener = null
  private webSocket: WebSocket = null
  private reconnectionCount: number
  private reconnectTimeoutId: number
  private configuratorID: number
  private store: Store<any>

  constructor(
    apiOptions: ApiOptions,
    webSocketOptions: WebSocketOptions,
    wsListener?: WebSocketListener,
    store?: Store<any>
  ) {
    this.host = apiOptions.host

    this.configs.defaultApi = {
      headers: {
        'Content-Type': 'application/json',
        //'X-CSRFTOKEN': '',
      },
      withCredentials: false,
      xsrfCookieName: 'csrftoken',
      //xsrfHeaderName: 'X-CSRFTOKEN',
    }
    this.configs.extendedApi = this.configs.defaultApi
    if (apiOptions.password && apiOptions.username) {
      const auth = Buffer.from(
        apiOptions.username + ':' + apiOptions.password
      ).toString('base64')
      this.configs.defaultApi.headers.Authorization = 'Basic ' + auth
    }

    if (!webSocketOptions.specificUrl) {
      webSocketOptions.specificUrl = webSocketOptions.baseUrl
    }
    this.wsOptions = {
      ...WebSocketOptionsDefaults,
      ...webSocketOptions,
    }

    if (wsListener) {
      this.wsListener = wsListener
    }

    if (store) {
      this.store = store
    }

    if (this.wsOptions.autoConnect) {
      this.connectWebSocket()
    }
  }

  getHost() {
    return this.host
  }

  /**
   * Login after construction. (use for public/private access)
   */
  async setCredentials(apiCredentials: ApiCredentials) {
    if (apiCredentials.password) {
      apiCredentials.username = apiCredentials.username
        ? apiCredentials.username
        : 'webfront'
      const auth = Buffer.from(
        apiCredentials.username + ':' + apiCredentials.password
      ).toString('base64')
      this.configs.defaultApi.headers.Authorization = 'Basic ' + auth
      this.wsOptions.protocol.push(auth.replaceAll('=', '%3D'))
      return true
    }
    return false
  }

  /**
   * Set the configuratorID. This is useful to target the whole API and WebSocket to the desired WebFront, since all private stuff is configurator specific.
   *
   * @param configuratorID The id of the desired Configurator.
   */
  setConfiguratorID(configuratorID: number) {
    this.configuratorID = configuratorID
    this.wsOptions.specificUrl = this.buildUrl(
      `/wfc/${configuratorID}/api/`,
      true
    )
  }

  /**
   * Connect WebSocket
   */
  connectWebSocket(): WebSocket {
    if (this.webSocket !== null) {
      throw new Error('Websocket already connected.')
    }
    this.webSocket = new WebSocket(
      this.wsOptions.specificUrl,
      this.wsOptions.protocol
    )

    // Initialize internal handlers for websocket events
    this.webSocket.onmessage = (ev: MessageEvent) => {
      if (this.wsListener) {
        this.wsListener.onmessage(ev)
      }
      if (this.store) {
        this.store.commit('SOCKET_ONMESSAGE', JSON.parse(ev.data))
      }
    }
    this.webSocket.onerror = (ev: Event) => {
      if (this.wsListener) {
        this.wsListener.onerror(ev)
      }
      if (this.store) {
        this.store.commit('SOCKET_ONERROR', ev)
      }
    }
    this.webSocket.onclose = (ev: CloseEvent) => {
      if (this.wsListener) {
        this.wsListener.onclose(ev)
      }
      if (this.store) {
        this.store.commit('SOCKET_ONCLOSE', ev)
      }
      if (this.wsOptions.reconnection) {
        this.reconnect()
      }
    }
    this.webSocket.onopen = (ev: CloseEvent) => {
      if (this.wsListener) {
        this.wsListener.onopen(ev)
      }
      if (this.store) {
        this.store.commit('SOCKET_ONOPEN', ev)
      }
      this.reconnectionCount = 0
    }

    return this.webSocket
  }

  setListener(wsListener: WebSocketListener) {
    if (this.wsListener !== null) {
      throw new Error('Listener already registered')
    }
    this.wsListener = wsListener
  }

  removeListener() {
    this.wsListener = null
  }

  /**
   * Send any object to websocket channel
   * @param obj
   */
  sendObj(obj: any): void {
    return this.webSocket.send(JSON.stringify(obj))
  }

  private reconnect() {
    if (this.reconnectionCount <= this.wsOptions.reconnectionAttempts) {
      this.reconnectionCount++
      clearTimeout(this.reconnectTimeoutId)

      this.reconnectTimeoutId = setTimeout(() => {
        if (this.wsListener) {
          this.wsListener.reconnect(this.reconnectionCount)
        }
        if (this.store) {
          this.store.commit('SOCKET_RECONNECT', this.reconnectionCount)
        }

        this.connectWebSocket()
      }, this.wsOptions.reconnectionDelay)
    } else {
      if (this.wsListener) {
        this.wsListener.reconnectError()
      }
      if (this.store) {
        this.store.commit('SOCKET_RECONNECT_ERROR', this.reconnectionCount)
      }
    }
  }

  /**
   * Performs a custom request
   * @param method Name of the Method
   * @param params Array of parameters for the given Method
   */
  async customRequest(method: string, params: any[] = []) {
    return await this.buildCall(method, params, false).execute()
  }

  /**
   * Returns all configurators
   */
  async getConfigurators() {
    return await this.buildCall(
      KnockautEndpoints.GetConfigurators,
      [],
      false
    ).execute()
  }

  /**
   * Executes an WFC_Execute command
   */
  async execute(command: WFCExecute) {
    const params = []
    params.push(this.configuratorID)
    params.push(command.actionID)
    params.push(parseInt(command.targetID.toString()))
    params.push(command.value)
    await this.buildCall(KnockautEndpoints.Execute, params, false).execute()
  }

  /**
   * Returns an actual snapshot for the given configurator
   */
  async getSnapshot(configuratorID: number = 0) {
    try {
      configuratorID =
        !configuratorID && this.configuratorID
          ? this.configuratorID
          : configuratorID
      let response = await axios.post(
        this.buildUrl(),
        this.buildData(KnockautEndpoints.GetSnapshot, [configuratorID]),
        this.configs.defaultApi
      )
      // TODO: Define interface for returned type
      return response.data
    } catch (error) {
      this.handleError(error)
    }
  }

  /**
   * Authenticates the user for the settings area. This is not the default api authentication
   */
  async authorize(password: string) {
    try {
      if (password) {
        const auth = Buffer.from('settings:' + password).toString('base64')
        this.configs.extendedApi.headers.Authorization = 'Basic ' + auth
        let response = await axios.post(
          this.buildUrl('/hook/knockaut/api/v1/'),
          this.buildData(KnockautEndpoints.KnockautAuthenticate, [
            this.configuratorID,
          ]),
          this.configs.extendedApi
        )
        // TODO: Define interface for returned type
        return response.data
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Returns all deviceconfigurations
   */
  async getConfigurations() {
    return await this.buildCall(KnockautEndpoints.GetConfigurations).execute()
  }

  /**
   * Sets a specific Device configuration
   */
  async setConfiguration(device) {
    return await this.buildCall(KnockautEndpoints.SetConfiguration, [
      device,
    ]).execute()
  }

  /**
   * Runs the schript with the given id
   */
  async runScene(scriptID: number) {
    return await this.buildCall(KnockautEndpoints.RunScene, [
      scriptID,
    ]).execute()
  }

  /**
   * Returns the configuration for the given house-automation-scene
   */
  async getSceneConfig(sceneID: number) {
    return await this.buildCall(KnockautEndpoints.GetSceneConfig, [
      sceneID,
    ]).execute()
  }

  /**
   * Syncronizes a Scene. (add, edit, delete script-content)
   */
  async syncScene(scene) {
    return await this.buildCall(KnockautEndpoints.SyncScene, [scene]).execute()
  }

  /**
   * Deletes an entire Scene-Script
   */
  async deleteScene(sceneID: number) {
    return await this.buildCall(KnockautEndpoints.DeleteScene, [
      sceneID,
    ]).execute()
  }

  /**
   * Returns the configuration for the given house-automation-scene
   */
  async getAlarms() {
    return await this.buildCall(KnockautEndpoints.GetAlarms).execute()
  }

  /**
   * Syncronizes a Scene. (add, edit, delete script-content)
   */
  async syncAlarm(alarm) {
    return await this.buildCall(KnockautEndpoints.SyncAlarm, [alarm]).execute()
  }

  /**
   * Deletes an entire Scene-Script
   */
  async deleteAlarm(alarmID: number) {
    return await this.buildCall(KnockautEndpoints.DeleteAlarm, [
      alarmID,
    ]).execute()
  }

  /**
   * Syncronizes an Event
   */
  async syncEvent(event) {
    return await this.buildCall(KnockautEndpoints.SyncEvent, [event]).execute()
  }

  /**
   * Deletes an entire Event
   */
  async deleteEvent(eventID: number) {
    return await this.buildCall(KnockautEndpoints.DeleteEvent, [
      eventID,
    ]).execute()
  }

  /**
   * Create, Update and Delete Links for Variables shown in the Footer of the Ultimate-App
   * This function searches for existing Link-IDs, The new Links are created from variable-IDs
   */
  async syncFooterVars(variables: Array<FooterVariable>) {
    return await this.buildCall(KnockautEndpoints.SyncFooterVars, [
      variables,
    ]).execute()
  }

  /**
   * Returns an Object in the same Structure as it is in the Snapshot
   */
  async getSnapshotObject(objectID: number) {
    return await this.buildCall(KnockautEndpoints.GetSnapshotObject, [
      objectID,
    ]).execute()
  }

  /**
   * Returns an Object of AppInfos and alailable Update info
   */
  async getAppInfo() {
    return await this.buildCall(KnockautEndpoints.GetAppInfo).execute()
  }

  /**
   * Returns true if the app was sucessfully updated
   */
  async updateApp() {
    return await this.buildCall(KnockautEndpoints.UpdateApp).execute()
  }

  /**
   * Returns the icon-url for the given Object
   * @param object The IPSymcon Snapshot Object or the ID of the Object
   */
  async getIcon(object: SnapshotObject | number) {
    // object can be either a snapshot-object, or just an ObjectID (int)
    var resp = await this.buildCall(KnockautEndpoints.GetIconUrl, [
      object,
    ]).execute()
    const icon_url: string = `${this.host}${resp}`
    return icon_url
  }

  getIconByName(name: string, ext: string = 'png') {
    if (name.startsWith('BRELAG')) {
      return `${this.host}/skins/KnockAutSkin/icons/${name}.${ext}`
    }
    return `${this.host}/img/icons/${name}.svg`
  }

  private buildUrl(path: string = '/api/', isSocket: boolean = false): string {
    return isSocket ? `${this.wsOptions.baseUrl}${path}` : `${this.host}${path}`
  }

  private buildData(method: string, params: number[] = []) {
    return {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    }
  }

  private buildCall(
    method: string,
    params: any[] = [],
    isExtendedCall: boolean = true
  ) {
    return {
      method: method,
      params: params,
      isExtendedCall: isExtendedCall,
      execute: async () => {
        try {
          if (isExtendedCall) {
            params = [this.configuratorID].concat(params)
          }
          let response = await axios.post(
            this.buildUrl(isExtendedCall ? '/hook/knockaut/api/v1/' : '/api/'),
            this.buildData(method, params),
            isExtendedCall ? this.configs.extendedApi : this.configs.defaultApi
          )
          // TODO: Define interface for returned type
          return response.data.result
        } catch (error) {
          this.handleError(error)
        }
      },
    }
  }

  private handleError(error: Error) {
    // Log and throw again
    console.log(error)
    throw error
  }
}
