// see https://stackoverflow.com/questions/38875401/getting-error-ts2304-cannot-find-name-buffer
declare const Buffer: any
import axios, { AxiosRequestConfig } from 'axios'

const KnockautEndpoints = {
  GetConfigurators: 'WFC_GetConfigurators',
}

// Connection options to Knockaut Backend
export interface ApiOptions {
  host: string
  password?: string
  username?: string
}

// Configuration for WebSocket Connection
export interface WebSocketOptions {
  url: string
  autoConnect?: boolean
  reconnection?: boolean
  format?: string
  reconnectionAttempts?: number
  reconnectionDelay?: number
  protocol?: string[]
}

// Default values
const WebSocketOptionsDefaults: WebSocketOptions = {
  url: '',
  autoConnect: true,
  reconnection: true,
  format: 'json',
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  protocol: [],
}

export interface WebSocketListener {
  onclose: (ev: CloseEvent) => any
  onerror: (ev: Event) => any
  onmessage: (ev: MessageEvent) => any
  onopen: (ev: Event) => any
  reconnect: (count: number) => any
  reconnectError: () => any
}

/**
 * ApiClient responsible for all communication to Knockaut Backend
 */
export class KnockautApiClient {
  private axiosConfig: AxiosRequestConfig
  private host: string
  private wsOptions: WebSocketOptions
  private wsListener: WebSocketListener = null
  private webSocket: WebSocket = null
  private reconnectionCount: number
  private reconnectTimeoutId: number

  constructor(
    apiOptions: ApiOptions,
    webSocketOptions: WebSocketOptions,
    wsListener?: WebSocketListener
  ) {
    this.host = apiOptions.host

    this.axiosConfig = {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFTOKEN': '',
      },
      withCredentials: true,
      xsrfCookieName: 'csrftoken',
      xsrfHeaderName: 'X-CSRFTOKEN',
    }
    if (apiOptions.password && apiOptions.username) {
      const auth = Buffer.from(
        apiOptions.username + ':' + apiOptions.password
      ).toString('base64')
      this.axiosConfig.headers.Authorization = 'Basic ' + auth
    }

    this.wsOptions = {
      ...WebSocketOptionsDefaults,
      ...webSocketOptions,
    }

    if (wsListener) {
      this.wsListener = wsListener
    }

    if (this.wsOptions.autoConnect) {
      this.connectWebSocket()
    }
  }

  /**
   * Connect WebSocket
   */
  connectWebSocket(): WebSocket {
    if (this.webSocket !== null) {
      throw new Error('Websocket already connected.')
    }
    this.webSocket = new WebSocket(this.wsOptions.url, this.wsOptions.protocol)

    // Initialize internal handlers for websocket events
    this.webSocket.onmessage = (ev: MessageEvent) => {
      if (this.wsListener) {
        this.wsListener.onmessage(ev)
      }
    }
    this.webSocket.onerror = (ev: Event) => {
      if (this.wsListener) {
        this.wsListener.onerror(ev)
      }
    }
    this.webSocket.onclose = (ev: CloseEvent) => {
      if (this.wsListener) {
        this.wsListener.onclose(ev)
      }
      if (this.wsOptions.reconnection) {
        this.reconnect()
      }
    }
    this.webSocket.onopen = (ev: CloseEvent) => {
      if (this.wsListener) {
        this.wsListener.onopen(ev)
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

        this.connectWebSocket()
      }, this.wsOptions.reconnectionDelay)
    } else {
      if (this.wsListener) {
        this.wsListener.reconnectError()
      }
    }
  }

  /**
   * Returns all configurators
   */
  async getConfigurators() {
    try {
      let response = await axios.post(
        this.buildUrl(KnockautEndpoints.GetConfigurators),
        this.buildData(KnockautEndpoints.GetConfigurators),
        this.axiosConfig
      )
      // TODO: Define interface for returned type
      return response.data
    } catch (error) {
      this.handleError(error)
    }
  }

  private buildUrl(path: string = '/api/'): string {
    return `${this.host}${path}`
  }

  private buildData(method: string, params: string[] = []) {
    return {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    }
  }

  private handleError(error: Error) {
    // Log and throw again
    console.log(error)
    throw error
  }
}
