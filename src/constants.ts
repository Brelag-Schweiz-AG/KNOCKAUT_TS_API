//MessageType

import { WebSocketOptions } from './interfaces'

//Typ der Websocket Nachricht
export enum WebSocketMessageType {
  KR_CREATE = 10101, // Kernel wurde erstellt
  KR_INIT = 10102, // Kernel Komponenten werden initialisiert, Module geladen und Settings eingelesen
  KR_READY = 10103, // Kernel ist bereit und läuft
  KR_UNINIT = 10104, // Shutdown-Befehl erhalten, finalisiere alles geladene
  KR_SHUTDOWN = 10105, // Finalisierung abgeschlossen, entferne Kernel
  KL_MESSAGE = 10201, // Normale Nachricht
  KL_SUCCESS = 10202, // Erfolg
  KL_NOTIFY = 10203, // Änderungsbenachrichtung
  KL_WARNING = 10204, // Warnung
  KL_ERROR = 10205, // Fehlermeldung
  KL_DEBUG = 10206, // Debug Information
  KL_CUSTOM = 10207, // Sonstige Nachrichten
  ML_LOAD = 10301, // Modul geladen
  ML_UNLOAD = 10302, // Modul entladen
  OM_REGISTER = 10401, // Objekt erstellt
  OM_UNREGISTER = 10402, // Objekt entfernt
  OM_CHANGEPARENT = 10403, // Übergeordnetes Objekt hat sich geändert
  OM_CHANGENAME = 10404, // Name hat sich geändert
  OM_CHANGEINFO = 10405, // Beschreibung hat sich geändert
  OM_CHANGETYPE = 10406, // Typ hat sich geändert
  OM_CHANGESUMMARY = 10407, // Kurzinfo hat sich geändert
  OM_CHANGEPOSITION = 10408, // Position hat sich geändert
  OM_CHANGEREADONLY = 10409, // Nur-Lesen-Status hat sich geändert
  OM_CHANGEHIDDEN = 10410, // Sichtbarkeit hat sich geändert
  OM_CHANGEICON = 10411, // Icon hat sich geändert
  OM_CHILDADDED = 10412, // Untergeordnetes Objekt hinzugefügt
  OM_CHILDREMOVED = 10413, // Untergeordnetes Objekt entfernt
  OM_CHANGEIDENT = 10414, // Ident hat sich geändert
  OM_CHANGEDISABLED = 10415, // Bedienbarkeit hat sich geändert
  IM_CREATE = 10501, // Instanz erstellt
  IM_DELETE = 10502, // Instanz entfernt
  IM_CONNECT = 10503, // Instanzinterface verfügbar
  IM_DISCONNECT = 10504, // Instanzinterface nicht mehr verfügbar
  IM_CHANGESTATUS = 10505, // Status hat sich geändert
  IM_CHANGESETTINGS = 10506, // Einstellungen haben sich geändert
  IM_SEARCHSTART = 10511, // Suche wurde gestartet
  IM_SEARCHSTOP = 10512, // Suche wurde gestoppt
  IM_SEARCHUPDATE = 10513, // Suche hat neue Ergebnisse
  VM_CREATE = 10601, // Variable wurde erstellt
  VM_DELETE = 10602, // Variable wurde entfernt
  VM_UPDATE = 10603, // Variable wurde aktualisiert
  VM_CHANGEPROFILENAME = 10604, // Variablenprofilname wurde geändert
  VM_CHANGEPROFILEACTION = 10605, // Variablenprofilaktion wurde geändert
  SM_CREATE = 10701, // Skript wurde erstellt
  SM_DELETE = 10702, // Skript wurde entfernt
  SM_CHANGEFILE = 10703, // Skript wurde Datei angehangen
  SM_BROKEN = 10704, // Skript Fehlerstatus hat sich geändert
  SM_UPDATE = 10704, // Skript wurde aktualisiert
  EM_CREATE = 10801, // Ereignis wurde erstellt
  EM_DELETE = 10802, // Ereignis wurde entfernt
  EM_UPDATE = 10803, // Ereignis wurde aktualisiert
  EM_CHANGEACTIVE = 10804, // Ereignisaktivierung hat sich geändert
  EM_CHANGELIMIT = 10805, // Ereignisaufruflimit hat sich geändert
  EM_CHANGESCRIPT = 10806, // Ereignisskriptinhalt hat sich geändert
  EM_CHANGETRIGGER = 10807, // Ereignisauslöser hat sich geändert
  EM_CHANGETRIGGERVALUE = 10808, // Ereignisgrenzwert hat sich geändert
  EM_CHANGETRIGGEREXECUTION = 10809, // Ereignisgrenzwertauslösung hat sich geändert
  EM_CHANGECYCLIC = 10810, // zyklisches Ereignis hat sich geändert
  EM_CHANGECYCLICDATEFROM = 10811, // Startdatum hat sich geändert
  EM_CHANGECYCLICDATETO = 10812, // Enddatum hat sich geändert
  EM_CHANGECYCLICTIMEFROM = 10813, // Startzeit hat sich geändert
  EM_CHANGECYCLICTIMETO = 10814, // Endzeit hat sich geändert
  EM_ADDSCHEDULEACTION = 10815, // Eintrag in der Aktionstabelle des Wochenplans wurde hinzugefügt
  EM_REMOVESCHEDULEACTION = 10816, // Eintrag in der Aktionstabelle des Wochenplans wurde entfernt
  EM_CHANGESCHEDULEACTION = 10817, // Eintrag in der Aktionstabelle des Wochenplans hat sich geändert
  EM_ADDSCHEDULEGROUP = 10818, // Gruppierung der Wochenplantage wurde hinzugefügt
  EM_REMOVESCHEDULEGROUP = 10819, // Gruppierung der Wochenplantage wurde entfernt
  EM_CHANGESCHEDULEGROUP = 10820, // Gruppierung der Wochenplantage hat sich geändert
  EM_ADDSCHEDULEGROUPPOINT = 10821, // Schaltpunkt einer Gruppierung wurde hinzugefügt
  EM_REMOVESCHEDULEGROUPPOINT = 10822, // Schaltpunkt einer Gruppierung wurde entfernt
  EM_CHANGESCHEDULEGROUPPOINT = 10823, // Schaltpunkt einer Gruppierung hat sich geändert
  EM_ADDCONDITION = 10824, // Bedingung wurde hinzugefügt
  EM_REMOVECONDITION = 10825, // Bedingung wurde entfernt
  EM_CHANGECONDITION = 10826, // Bedingung hat sich geändert
  EM_ADDCONDITIONVARIABLERULE = 10827, // Variablenregel der Bedingung wurde hinzugefügt
  EM_REMOVECONDITIONVARIABLERULE = 10828, // Variablenregel der Bedingung wurde entfernt
  EM_CHANGECONDITIONVARIABLERULE = 10829, // Variablenregel der Bedingung hat sich geändert
  EM_ADDCONDITIONDATERULE = 10830, // Datumsregel der Bedingung wurde hinzugefügt
  EM_REMOVECONDITIONDATERULE = 10831, // Datumsregel der Bedingung wurde entfernt
  EM_CHANGECONDITIONDATERULE = 10832, // Datumsregel der Bedingung hat sich geändert
  EM_ADDCONDITIONTIMERULE = 10833, // Zeitregel der Bedingung wurde hinzugefügt
  EM_REMOVECONDITIONTIMERULE = 10834, // Zeitregel der Bedingung wurde entfernt
  EM_CHANGECONDITIONTIMERULE = 10835, // Zeitregel der Bedingung hat sich geändert
  MM_CREATE = 10901, // Medienobjekt wurde erstellt
  MM_DELETE = 10902, // Medienobjekt wurde entfernt
  MM_CHANGEFILE = 10903, // Datei des Medienobjekts wurde geändert
  MM_AVAILABLE = 10904, // Verfügbarkeit des Medienobjekts hat sich geändert
  MM_UPDATE = 10905, // Medienobjekt wurde aktualisiert
  MM_CHANGECACHED = 10906, // Cacheoption vom Medienobjekt hat sich geändert
  LM_CREATE = 11001, // Link wurde erstellt
  LM_DELETE = 11002, // Link wurde entfernt
  LM_CHANGETARGET = 11003, // Ziel des Links hat sich geändert
  FM_CONNECT = 11101, // Instanz wurde verbunden
  FM_DISCONNECT = 11102, // Instanz wurde getrennt
  FM_CHILDADDED = 11103, // Untergeordnete Instanz wurde mit dieser Instanz verbunden
  FM_CHILDREMOVED = 11104, // Untergeordnete Instanz wurde von dieser Instanz getrennt
  SE_UPDATE = 11201, // Scriptengine wurde neu geladen
  SE_EXECUTE = 11202, // Script wurde ausgeführt
  SE_RUNNING = 11203, // Script wird ausgeführt
  PM_CREATE = 11301, // Profil wurde erstellt
  PM_DELETE = 11302, // Profil wurde entfernt
  PM_CHANGETEXT = 11303, // Profilprefix/Profilsuffix hat sich geändert
  PM_CHANGEVALUES = 11304, // Profilwerte haben sich geändert
  PM_CHANGEDIGITS = 11305, // Profilnachkommastellen haben sich geändert
  PM_CHANGEICON = 11306, // Profilicon hat sich geändert
  PM_ASSOCIATIONADDED = 11307, // Profilassoziation wurde hinzugefügt
  PM_ASSOCIATIONREMOVED = 11308, // Profilassoziation wurde entfernt
  PM_ASSOCIATIONCHANGED = 11309, // Profilassoziation hat sich geändert
  TM_REGISTER = 11401, // Timer wurde erstellt
  TM_UNREGISTER = 11402, // Timer wurde entfernt
  TM_CHANGEINTERVAL = 11403, // Timer Interval hat sich geändert
}

/** Functions that are accessible with a dashboard authentication */
export const DashboardEndpoints = {
  /** WFC Functions **/
  WFC_GetConfigurators: 'WFC_GetConfigurators',
  WFC_GetSnapshot: 'WFC_GetSnapshot',
  WFC_Execute: 'WFC_Execute',
  WFC_RegisterPNS: 'WFC_RegisterPNS',

  /** Custom Helper Functions **/
  GetAppInfo: 'KNO_GetAppInfo',
  GetConfigurations: 'KNO_GetConfigurations',
  GetConfiguration: 'KNO_GetConfiguration',
  SetConfiguration: 'KNO_SetConfiguration',
  GetIcons: 'KNO_GetIcons',
  GetIconUrl: 'KNO_GetIconUrl',
  GetSnapshotObject: 'KNO_GetSnapshotObject',
  RunScene: 'KNO_RunScene',
  UpdateApp: 'KNO_UpdateApp',
  GetLoggedValues: 'KNO_GetLoggedValues',
  InitSystemFolders: 'KNO_InitSystemFolders',

  /** Default Symcon Functions **/
  GetLibraryList: 'IPS_GetLibraryList',
  GetModule: 'IPS_GetModule',
  GetLibrary: 'IPS_GetLibrary',
  GetLibraryModules: 'IPS_GetLibraryModules',
  GetModuleList: 'IPS_GetModuleList',
  GetInstanceListByModuleID: 'IPS_GetInstanceListByModuleID',
  GetActionsByEnvironment: 'IPS_GetActionsByEnvironment',
  GetTranslatedActionsByEnvironment: 'IPS_GetTranslatedActionsByEnvironment',

  /** Symcon Notification Control **/
  NC_AddDevice: 'NC_AddDevice',
  NC_GetDevices: 'NC_GetDevices',
  NC_RemoveDevice: 'NC_RemoveDevice',
  NC_SetDeviceName: 'NC_SetDeviceName',
}

/** Functions that are accessible with an advanced settings authentication */
export const AdvancedSettingsEndpoints = {
  GetSceneConfig: 'KNO_GetSceneConfig',
  SyncScene: 'KNO_SyncScene',
  DeleteScene: 'KNO_DeleteScene',
  GetAlarms: 'KNO_GetAlarms',
  SyncAlarm: 'KNO_SyncAlarm',
  DeleteAlarm: 'KNO_DeleteAlarm',
  SyncEvent: 'KNO_SyncEvent',
  DeleteEvent: 'KNO_DeleteEvent',
  SyncFooterVars: 'KNO_SyncFooterVars',
  ChangePassword: 'KNO_ChangePassword',
  GetFlowScriptData: 'KNO_GetFlowScriptData',
  SyncFlowScript: 'KNO_SyncFlowScript',
  DeleteFlowScript: 'KNO_DeleteFlowScript',
}

// Default values
export const WebSocketOptionsDefaults: WebSocketOptions = {
  baseUrl: '',
  specificUrl: '',
  autoConnect: true,
  reconnection: true,
  format: 'json',
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  protocol: [],
}
