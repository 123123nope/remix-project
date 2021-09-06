/* eslint-disable no-undef */
/* eslint-disable dot-notation */
import { PluginClient } from '@remixproject/plugin'
import { createClient } from '@remixproject/plugin-webview'
import { CompilerApiMixin } from './compiler-api'
import { ICompilerApi } from '@remix-project/remix-lib-ts'
import { CompileTabLogic } from '@remix-ui/solidity-compiler'

const profile = {
  name: 'solidity',
  displayName: 'Solidity compiler',
  icon: 'assets/img/solidity.webp',
  description: 'Compile solidity contracts',
  kind: 'compiler',
  permission: true,
  location: 'sidePanel',
  documentation: 'https://remix-ide.readthedocs.io/en/latest/solidity_editor.html',
  version: '0.0.1',
  methods: ['getCompilationResult', 'compile', 'compileWithParameters', 'setCompilerConfig', 'compileFile', 'getCompilerState']
}

const defaultAppParameters = {
  hideWarnings: false,
  autoCompile: false,
  includeNightlies: false
}

const defaultCompilerParameters = {
  runs: '200',
  optimize: false,
  version: 'soljson-v0.8.7+commit.e28d00a7',
  evmVersion: null, // compiler default
  language: 'Solidity'
}

export class CompilerClientApi extends CompilerApiMixin(PluginClient) implements ICompilerApi {
  // interface matches libs/remix-ui/solidity-compiler/types/index.ts : ICompilerApi
  currentFile: string
  contractMap: {
    file: string
  } | Record<string, any>

  compileErrors: any
  compileTabLogic: any
  contractsDetails: Record<string, any>
  configurationSettings: ConfigurationSettings

  setHardHatCompilation: (value: boolean) => void
  getParameters: () => ConfigurationSettings
  setParameters: (params: Partial<ConfigurationSettings>) => void
  setCompilerConfig: (settings: ConfigurationSettings) => void

  getConfiguration: (value: string) => string
  setConfiguration: (name: string, value: string) => void
  getFileManagerMode: () => string

  getCompilationResult: () => any

  onCurrentFileChanged: (fileName: string) => void
  onResetResults: () => void
  onSetWorkspace: (isLocalhost: boolean) => void
  onNoFileSelected: () => void
  onCompilationFinished: (contractsDetails: any, contractMap: any) => void
  onSessionSwitched: () => void
  onContentChanged: () => void

  fileExists: (file: string) => Promise<boolean>
  writeFile: (file: string, content: string) => Promise<void>
  readFile: (file: string) => Promise<string>
  open: (file: string) => void

const getOptimize = () => {
  let value = localStorage.getItem('optimize') || defaultCompilerParameters['optimize']
  value = (value === 'false' || value === null || value === undefined) ? false : value
  value = value === 'true'
}

const defaultAppParameters = {
  hideWarnings: false,
  autoCompile: false,
  includeNightlies: false
}

const defaultCompilerParameters = {
  runs: '200',
  optimize: false,
  version: 'soljson-v0.8.7+commit.e28d00a7',
  evmVersion: null, // compiler default
  language: 'Solidity'
}

const getOptimize = () => {
  let value = localStorage.getItem('optimize') || defaultCompilerParameters['optimize']
  value = (value === 'false' || value === null || value === undefined) ? false : value
  value = value === 'true'
}

const defaultAppParameters = {
  hideWarnings: false,
  autoCompile: false,
  includeNightlies: false
}

const defaultCompilerParameters = {
  runs: '200',
  optimize: false,
  version: 'soljson-v0.8.7+commit.e28d00a7',
  evmVersion: null, // compiler default
  language: 'Solidity'
}

constructor () {
  super()
  createClient(this as any)
  this.initCompilerApi()
}
}
