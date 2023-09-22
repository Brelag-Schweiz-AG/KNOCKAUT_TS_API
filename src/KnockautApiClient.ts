import * as Buffer from 'buffer'
import axios, { AxiosRequestConfig } from 'axios'
import { Store } from 'vuex'
import {
  ApiCredentials,
  ApiOptions,
  FooterVariable,
  SnapshotObject,
  SymconLibrary,
  SymconModule,
  WebSocketListener,
  WebSocketMessage,
  WebSocketOptions,
  WFCExecute,
} from './interfaces'
import {
  WebSocketOptionsDefaults,
  DashboardEndpoints,
  AdvancedSettingsEndpoints,
  WFC_Endpoints,
  SymconObjectType,
  SymconVariableType,
  AdaptiveIcons,
} from './constants'

/**
 * ApiClient responsible for all communication to Knockaut Backend
 */
export class KnockautApiClient {
  private host: string
  private wsOptions: WebSocketOptions
  private wsListener: WebSocketListener = null
  private webSocket: WebSocket = null
  private reconnectionCount: number
  private reconnectTimeoutId: number
  private configuratorID: number
  private store: Store<any>
  private skin: string

  // Authorization for default API calls using remote access login
  private apiAuthorization: string = null
  // Authorization for dashboard functions (Ultimate App)
  private dashboardAuthorization: string = null
  // Authorization for advanced settings functions (Ultimate App)
  private advancedSettingsAuthorization: string = null

  constructor(
    apiOptions: ApiOptions,
    webSocketOptions: WebSocketOptions,
    wsListener?: WebSocketListener,
    store?: Store<any>
  ) {
    this.host = apiOptions.host

    if (apiOptions.password && apiOptions.username) {
      const auth = Buffer.Buffer.from(
        apiOptions.username + ':' + apiOptions.password
      ).toString('base64')
      this.apiAuthorization = 'Basic ' + auth
    }
    if (apiOptions.skin) {
      this.skin = apiOptions.skin
    } else {
      this.skin = 'KNOCKAUT_DI_Skin'
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

  /** Sets password to access advanced settings functions */
  setAdvancedSettingsPassword(password: string) {
    const auth = Buffer.Buffer.from('settings:' + password).toString('base64')
    // TODO: Should we verify password first and throw error?
    this.advancedSettingsAuthorization = 'Basic ' + auth
  }

  /** Sets password to access dashboard functions */
  setDashboardPassword(password: string) {
    const auth = Buffer.Buffer.from('webfront:' + password).toString('base64')
    // TODO: Should we verify password first and throw error?
    this.dashboardAuthorization = 'Basic ' + auth
    this.wsOptions.protocol = [auth.replaceAll('=', '%3D')]
  }

  /** Sets password to access default Symcon API */
  setApiCredentials(apiCredentials: ApiCredentials) {
    const auth = Buffer.Buffer.from(
      apiCredentials.username + ':' + apiCredentials.password
    ).toString('base64')
    this.apiAuthorization = 'Basic ' + auth
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
   * Closes current WebSocket connection
   */
  closeWebSocket() {
    if (this.webSocket !== null) {
      try {
        /* Set to 100, to prevent imediate reconnection in the sockets onClose hook.
        otherwise, socket immediately reconnects if <10 and store is connected. */
        this.reconnectionCount = 100
        this.webSocket.close()
      } catch (ex) {}
      this.webSocket = null
    }
  }

  /**
   * Connect WebSocket
   */
  connectWebSocket(): WebSocket {
    if (this.webSocket !== null) {
      try {
        this.webSocket.close()
      } catch (ex) {}
      this.webSocket = null
      this.reconnect()
      return
    }
    this.webSocket = new WebSocket(
      this.wsOptions.specificUrl,
      this.wsOptions.protocol
    )

    // Initialize internal handlers for websocket events
    this.webSocket.onmessage = (ev: MessageEvent) => {
      if (this.wsListener) {
        if (
          this.wsListener.acceptedMessageTypes &&
          this.wsListener.onFilteredMessage
        ) {
          const data = JSON.parse(ev.data) as WebSocketMessage
          if (this.wsListener.acceptedMessageTypes.indexOf(data.Message) > -1) {
            this.wsListener.onFilteredMessage(data.Message, data)
          }
        } else {
          this.wsListener.onmessage(ev)
        }
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
      // Only reconnect if somebody is listening
      if (this.wsOptions.reconnection && (this.store || this.wsListener)) {
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
  sendWebsocketObject(obj: any): void {
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
      if (!this.wsListener && !this.store) {
        throw new Error('Too many Websocket reconnect attempts.')
      }
    }
  }

  /**
   * Performs a custom request
   * @param method Name of the Method
   * @param params Array of parameters for the given Method
   */
  async customRequest(method: string, params: any[] = []) {
    return this.executeApiCall(method, params)
  }

  /**
   * Returns all configurators
   */
  async getConfigurators() {
    return this.executeApiCall(WFC_Endpoints.WFC_GetConfigurators)
  }

  /**
   * Executes an WFC_Execute command
   */
  async execute(command: WFCExecute): Promise<any> {
    const params = []
    params.push(this.configuratorID)
    params.push(command.actionID)
    params.push(parseInt(command.targetID.toString()))
    params.push(command.value)
    return this.executeApiCall(WFC_Endpoints.WFC_Execute, params)
  }

  /**
   * Returns an actual snapshot for the given configurator
   */
  async getSnapshot(configuratorID: number = 0) {
    configuratorID =
      !configuratorID && this.configuratorID
        ? this.configuratorID
        : configuratorID
    return this.executeApiCall(WFC_Endpoints.WFC_GetSnapshot, [configuratorID])
  }

  /**
   * Returns all deviceconfigurations
   */
  async getConfigurations() {
    return this.executeApiCall(DashboardEndpoints.KNO_GetConfigurations)
  }

  /**
   * Returns all deviceconfigurations
   */
  async getConfiguration(instanceId) {
    return this.executeApiCall(DashboardEndpoints.KNO_GetConfiguration, [
      instanceId,
    ])
  }

  /**
   * Sets a specific Device configuration
   */
  async setConfiguration(device) {
    return this.executeApiCall(DashboardEndpoints.KNO_SetConfiguration, [
      device,
    ])
  }

  /**
   * Runs the schript with the given id
   */
  async runScene(scriptID: number) {
    return this.executeApiCall(DashboardEndpoints.KNO_RunScene, [scriptID])
  }

  /**
   * Returns the configuration for the given house-automation-scene
   */
  async getSceneConfig(sceneID: number) {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_GetSceneConfig, [
      sceneID,
    ])
  }

  /**
   * Syncronizes a Scene. (add, edit, delete script-content)
   */
  async syncScene(scene) {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_SyncScene, [scene])
  }

  /**
   * Deletes an entire Scene-Script
   */
  async deleteScene(sceneID: number) {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_DeleteScene, [
      sceneID,
    ])
  }

  /**
   * Returns the configuration for the given house-automation-scene
   */
  async getAlarms() {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_GetAlarms)
  }

  /**
   * Syncronizes a Scene. (add, edit, delete script-content)
   */
  async syncAlarm(alarm) {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_SyncAlarm, [alarm])
  }

  /**
   * Deletes an entire Scene-Script
   */
  async deleteAlarm(alarmID: number) {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_DeleteAlarm, [
      alarmID,
    ])
  }

  /**
   * Syncronizes an Event
   */
  async syncEvent(event) {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_SyncEvent, [event])
  }

  /**
   * Deletes an entire Event
   */
  async deleteEvent(eventID: number) {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_DeleteEvent, [
      eventID,
    ])
  }

  /**
   * Create, Update and Delete Links for Variables shown in the Footer of the Ultimate-App
   * This function searches for existing Link-IDs, The new Links are created from variable-IDs
   */
  async syncFooterVars(variables: Array<FooterVariable>) {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_SyncFooterVars, [
      variables,
    ])
  }

  /**
   * Returns an Object in the same Structure as it is in the Snapshot
   */
  async getSnapshotObject(objectID: number) {
    return this.executeApiCall(DashboardEndpoints.KNO_GetSnapshotObject, [
      objectID,
    ])
  }

  /**
   * Changes the settings password and returns an object with sucess or error messages
   */
  async changePassword(oldPassword: number, newPassword: number) {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_ChangePassword, [
      {
        old: oldPassword,
        new: newPassword,
      },
    ])
  }

  /**
   * Returns an Object of AppInfos and alailable Update info
   */
  async getAppInfo() {
    return this.executeApiCall(DashboardEndpoints.KNO_GetAppInfo)
  }

  /**
   * Returns true if the app was sucessfully updated
   */
  async updateApp(appVersion: string = null) {
    return this.executeApiCall(DashboardEndpoints.KNO_UpdateApp, [appVersion])
  }

  /**
   * Checks if all system folders exist and creates missing folders.
   * @returns bool True if initialization was sucessful
   */
  async initSystemFolders(): Promise<any[]> {
    return this.executeApiCall(DashboardEndpoints.KNO_InitSystemFolders)
  }

  /**
   * https://www.symcon.de/service/dokumentation/modulreferenz/archive-control/ac-getloggedvalues/
   */
  async getLoggedValues(parameters: Array<number>): Promise<string[]> {
    return this.executeApiCall(
      DashboardEndpoints.KNO_GetLoggedValues,
      parameters
    )
  }

  /**
   * https://www.symcon.de/service/dokumentation/befehlsreferenz/modulverwaltung/ips-getlibrarylist/
   */
  async getLibraryList(): Promise<string[]> {
    return this.executeApiCall(DashboardEndpoints.IPS_GetLibraryList)
  }

  /**
   * https://www.symcon.de/service/dokumentation/befehlsreferenz/modulverwaltung/ips-getmodule/
   */
  async getModule(moduleId: string): Promise<SymconModule> {
    return this.executeApiCall(DashboardEndpoints.IPS_GetModule, [moduleId])
  }

  /**
   * https://www.symcon.de/service/dokumentation/befehlsreferenz/modulverwaltung/ips-getlibrary/
   */
  async getLibrary(libraryId: string): Promise<SymconLibrary> {
    return this.executeApiCall(DashboardEndpoints.IPS_GetLibrary, [libraryId])
  }

  /**
   * https://www.symcon.de/service/dokumentation/befehlsreferenz/modulverwaltung/ips-getlibrarymodules/
   */
  async getLibraryModules(libraryId: string): Promise<string[]> {
    return this.executeApiCall(DashboardEndpoints.IPS_GetLibraryModules, [
      libraryId,
    ])
  }

  /**
   * https://www.symcon.de/service/dokumentation/befehlsreferenz/modulverwaltung/ips-getmodulelist/
   */
  async getModuleList(): Promise<any[]> {
    return this.executeApiCall(DashboardEndpoints.IPS_GetModuleList)
  }

  /**
   * https://www.symcon.de/service/dokumentation/befehlsreferenz/instanzenverwaltung/ips-getinstancelistbymoduleid/
   */
  async getInstanceListByModuleID(moduleId: string): Promise<any[]> {
    return this.executeApiCall(
      DashboardEndpoints.IPS_GetInstanceListByModuleID,
      [moduleId]
    )
  }

  async NC_AddDevice(
    instanceID: number,
    token: string,
    provider: string,
    deviceID: string,
    name: string,
    webFrontVisualizationID: number
  ): Promise<string> {
    return this.executeApiCall(DashboardEndpoints.NC_AddDevice, [
      instanceID,
      token,
      provider,
      deviceID,
      name,
      webFrontVisualizationID,
    ])
  }

  async NC_GetDevices(instanceID: number): Promise<string[]> {
    return this.executeApiCall(DashboardEndpoints.NC_GetDevices, [instanceID])
  }

  async NC_RemoveDevice(
    instanceID: number,
    deviceID: string
  ): Promise<boolean> {
    return this.executeApiCall(DashboardEndpoints.NC_RemoveDevice, [
      instanceID,
      deviceID,
    ])
  }

  async NC_SetDeviceName(
    instanceID: number,
    deviceID: string,
    name: string
  ): Promise<boolean> {
    return this.executeApiCall(DashboardEndpoints.NC_SetDeviceName, [
      instanceID,
      deviceID,
      name,
    ])
  }

  async WFC_RegisterPNS(
    instanceID: number,
    token: string,
    provider: string,
    deviceID: string,
    name: string
  ): Promise<string> {
    return this.executeApiCall(WFC_Endpoints.WFC_RegisterPNS, [
      instanceID,
      token,
      provider,
      deviceID,
      name,
    ])
  }

  /**
   * There is no specific documentation for this function.
   * Actions: https://www.symcon.de/service/dokumentation/entwicklerbereich/sdk-tools/sdk-php/aktionen/
   * Parameters: https://www.symcon.de/service/dokumentation/befehlsreferenz/ablaufsteuerung/ips-runaction/
   * function IPS_GetActionsByEnvironment(int $TargetID, string $Environment, bool $IncludeDefault)
   */
  async getActionsByEnvironment(
    targetID: number,
    environment: string,
    includeDefault: boolean = true
  ): Promise<any[]> {
    return this.executeApiCall(DashboardEndpoints.IPS_GetActionsByEnvironment, [
      targetID,
      environment,
      includeDefault,
    ])
  }

  async getTranslatedActionsByEnvironment(
    targetID: number,
    environment: string,
    includeDefault: boolean = true,
    languageCode: string = 'de'
  ): Promise<any[]> {
    return this.executeApiCall(
      DashboardEndpoints.IPS_GetTranslatedActionsByEnvironment,
      [targetID, environment, includeDefault, languageCode]
    )
  }

  async getFlowScriptData(scriptID: number): Promise<any[]> {
    return this.executeApiCall(
      AdvancedSettingsEndpoints.KNO_GetFlowScriptData,
      [scriptID]
    )
  }

  async syncFlowScript(data: any): Promise<any[]> {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_SyncFlowScript, [
      data,
    ])
  }

  async deleteFlowScript(flowscriptID: number): Promise<any[]> {
    return this.executeApiCall(AdvancedSettingsEndpoints.KNO_DeleteFlowScript, [
      flowscriptID,
    ])
  }

  /**
   * Returns an array of object of which each has the icons "name" and "svg".
   * If no parameter is set, it returns all the available icons.
   * If an array of icon names is set as parameter,
   * it only reeturns the defined icons.
   */
  async getIcons(iconNames: string[] = []): Promise<any[]> {
    return this.executeApiCall(DashboardEndpoints.KNO_GetIcons, [iconNames])
  }

  /**
   * Returns the icon-url for the given Object
   * @param object The IPSymcon Snapshot Object or the ID of the Object
   */
  getIcon(
    object: SnapshotObject | number | string,
    findOrFail: boolean = false // if set to false, it returns a default icon by type. (extended knockaut rule)
  ) {
    // object can be either a snapshot-object, an ObjectID (int), or just an icon name (string)
    const iconName = this.getIconLocal(object, '', findOrFail)
    if (typeof iconName === 'boolean') {
      return iconName
    }
    if (iconName.startsWith('BRELAG')) {
      return `${this.host}/skins/${this.skin}/icons/${iconName}`
    }
    return `${this.host}/img/icons/${iconName}`
  }

  getIconLocal(
    data: SnapshotObject | number | string,
    path: string = '@/assets/icons/',
    findOrFail: boolean = false
  ) {
    let iconName = ''
    if (Number.isNaN(parseInt(<string>data)) && typeof data === 'string') {
      /* STRING INPUT */
      // icon name as received
      iconName = <string>data
    } else {
      if (!Number.isNaN(parseInt(<string>data))) {
        /* NUMBER INPUT */
        // get SnapshotObject by objectID
        const objectID = data
        data = this.store.state.snapshot.objects['ID' + objectID]
        if (!data) {
          return null
        }
      }
      /* OBJECT INPUT or object found from number input. */
      let object: SnapshotObject = <SnapshotObject>data
      // 1. get icon from object itself
      iconName = object.icon
      if (!iconName) {
        // 2. get icon from link-target
        if (object.type === SymconObjectType.Link) {
          object =
            this.store.state.snapshot.objects['ID' + object.data.targetID]
          iconName = object.icon
        }
        if (!iconName) {
          // 3. get icon by object-type
          switch (object.type) {
            case SymconObjectType.Category:
              iconName = findOrFail ? '' : 'Door'
              break
            case SymconObjectType.Instance:
              iconName = findOrFail ? '' : 'Plug'
              break
            case SymconObjectType.Variable:
              // find variable profile
              let profileName = object.data.profile
              if (object.data.customProfile) {
                profileName = object.data.customProfile
              }
              if (profileName) {
                const profile = this.store.state.snapshot.profiles[profileName]
                // 4. get icon by profile association
                if (
                  profile &&
                  Array.isArray(profile.associations) &&
                  profile.associations.length > 0
                ) {
                  let association = undefined
                  let value = undefined
                  // typecast value
                  switch (object.data.type) {
                    case SymconVariableType.Boolean:
                      value = Boolean(object.data.value)
                      break
                    case SymconVariableType.Float:
                      value = parseFloat(object.data.value)
                      break
                    case SymconVariableType.Integer:
                      value = parseInt(object.data.value)
                      break
                    case SymconVariableType.String:
                      value = String(object.data.value)
                      break
                  }
                  if (object.data.type !== SymconVariableType.Float) {
                    // search exact match
                    association = profile.associations.find((assoc) => {
                      return assoc.value === value
                    })
                  } else {
                    // search nearest
                    association = profile.associations.reduce(
                      (nearest, obj) => {
                        return Math.abs(value - obj.value) <
                          Math.abs(value - nearest.value)
                          ? obj
                          : nearest
                      }
                    )
                  }
                  iconName = association ? association.icon : ''
                }
                // 5. get defined icon from profile
                if (!iconName) {
                  if (profile) {
                    iconName = profile.icon
                    // if profile icon exists and icon is adaptive,
                    // then try to get adaptive icon
                    if (!!iconName && !!AdaptiveIcons[iconName]) {
                      if (profile.type !== SymconVariableType.String) {
                        // "+" converts bool, int and float to number
                        const absValue = +object.data.value
                        let percentValue = -1
                        if (
                          [
                            SymconVariableType.Integer,
                            SymconVariableType.Float,
                          ].includes(profile.type)
                        ) {
                          const v = {
                            min: profile.minValue,
                            max: profile.maxValue,
                            x: absValue,
                          }
                          if (v.max > v.min) {
                            percentValue =
                              ((v.x - v.min) / (v.max - v.min)) * 100
                          }
                        } else {
                          // boolean
                          percentValue = absValue * 100
                        }
                        // if percent is valid, get specific version of the icon.
                        // otherwise leave the icon in default version.
                        if (percentValue >= 0) {
                          // search nearest
                          const iconValue = AdaptiveIcons[iconName].reduce(
                            (nearest, numb) => {
                              return Math.abs(percentValue - numb) <
                                Math.abs(percentValue - nearest)
                                ? numb
                                : nearest
                            }
                          )
                          iconName += '-' + iconValue
                        }
                      }
                    }
                  }
                }
                // 6. set fallback icon
                if (!iconName) {
                  iconName = findOrFail ? '' : 'Minus'
                }
              } else {
                iconName = findOrFail ? '' : 'Minus'
              }
              break
            case SymconObjectType.Script:
              iconName = 'Script'
              break
            case SymconObjectType.Event:
              iconName = findOrFail ? '' : 'Clock'
              break
            case SymconObjectType.Media:
              iconName = 'Image'
              break
            case SymconObjectType.Link:
              iconName = findOrFail ? '' : 'Link'
              break
          }
        }
      }
    }
    if (!iconName && findOrFail) {
      return false
    }
    return `${path}${iconName}.svg`
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

  async executeApiCall(method: string, params: any[] = []) {
    const axiosConfig: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiAuthorization,
      },
      withCredentials: false,
      xsrfCookieName: 'csrftoken',
    }
    // Depending on which endpoint we are accessing, need to use different authentication
    let urlPath = '/hook/knockaut/api/v1/'
    if (DashboardEndpoints[method]) {
      params = [this.configuratorID].concat(params)
      axiosConfig.headers.Authorization = JSON.parse(
        JSON.stringify(this.dashboardAuthorization)
      )
    } else if (AdvancedSettingsEndpoints[method]) {
      params = [this.configuratorID].concat(params)
      axiosConfig.headers.Authorization = JSON.parse(
        JSON.stringify(this.advancedSettingsAuthorization)
      )
    } else {
      urlPath = '/api/'
      if (WFC_Endpoints[method]) {
        axiosConfig.headers.Authorization = JSON.parse(
          JSON.stringify(this.dashboardAuthorization)
        )
      } else {
        axiosConfig.headers.Authorization = JSON.parse(
          JSON.stringify(this.apiAuthorization)
        )
      }
    }
    try {
      const response = await axios.post(
        this.buildUrl(urlPath),
        this.buildData(method, params),
        axiosConfig
      )
      if (response.data.error) {
        if (response.data.error.message) {
          throw new Error(response.data.error.message)
        } else {
          throw new Error(response.data.error)
        }
      }
      return response.data.result
    } catch (error) {
      this.handleError(error, method, params)
    }
  }

  private handleError(error: Error, method: string, params: any[]) {
    // Log and throw again
    console.warn({ error, method, params })
    throw error
  }
}
