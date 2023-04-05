'use strict'

import {
  Plugin
} from '@remixproject/engine'
import git, { ReadBlobResult } from 'isomorphic-git'
import IpfsHttpClient from 'ipfs-http-client'
import {
  saveAs
} from 'file-saver'
import http from 'isomorphic-git/http/web'
import { Octokit } from "@octokit/core";

import JSZip from 'jszip'
import path from 'path'
import { IndexedDBStorage } from './filesystems/indexedDB'
import { commitChange, remote } from '@remix-ui/git'

declare global {
  interface Window { remixFileSystemCallback: IndexedDBStorage; remixFileSystem: IndexedDBStorage['extended']; }
}

const profile = {
  name: 'dGitProvider',
  displayName: 'Decentralized git',
  description: 'Decentralized git provider',
  icon: 'assets/img/fileManager.webp',
  version: '0.0.1',
  methods: ['init', 'localStorageUsed', 'getCommitChanges', 'addremote', 'delremote', 'remotes', 'fetch', 'clone', 'export', 'import', 'status', 'log', 'commit', 'add', 'remove', 'rm', 'lsfiles', 'readblob', 'resolveref', 'branches', 'branch', 'checkout', 'currentbranch', 'push', 'pin', 'pull', 'pinList', 'unPin', 'setIpfsConfig', 'zip', 'setItem', 'getItem', 'repositories', 'remotebranches'],
  kind: 'file-system'
}
class DGitProvider extends Plugin {
  ipfsconfig: { host: string; port: number; protocol: string; ipfsurl: string }
  globalIPFSConfig: { host: string; port: number; protocol: string; ipfsurl: string }
  remixIPFS: { host: string; port: number; protocol: string; ipfsurl: string }
  ipfsSources: { host: string; port: number; protocol: string; ipfsurl: string }[]
  ipfs: any
  filesToSend: any[]
  constructor() {
    super(profile)
    this.ipfsconfig = {
      host: 'jqgt.remixproject.org',
      port: 443,
      protocol: 'https',
      ipfsurl: 'https://jqgt.remixproject.org/ipfs/'
    }
    this.globalIPFSConfig = {
      host: 'ipfs.io',
      port: 443,
      protocol: 'https',
      ipfsurl: 'https://ipfs.io/ipfs/'
    }
    this.remixIPFS = {
      host: 'jqgt.remixproject.org',
      port: 443,
      protocol: 'https',
      ipfsurl: 'https://jqgt.remixproject.org/ipfs/'
    }
    this.ipfsSources = [this.remixIPFS, this.globalIPFSConfig, this.ipfsconfig]
  }

  async getGitConfig() {
    const workspace = await this.call('filePanel', 'getCurrentWorkspace')

    if (!workspace) return
    return {
      fs: window.remixFileSystemCallback,
      dir: addSlash(workspace.absolutePath)
    }
  }

  onActivation(): void {
      console.log('dgit activated')
  }

  async parseInput(input) {
    return {
      corsProxy: 'https://corsproxy.remixproject.org/',
      http,
      onAuth: url => {
        url
        const auth = {
          username: input.token,
          password: ''
        }
        return auth
      }
    }
  }

  async init(input?) {
    await git.init({
      ...await this.getGitConfig(),
      defaultBranch: (input && input.branch) || 'main'
    })
    this.emit('init')
  }

  async status(cmd) {
    const status = await git.statusMatrix({
      ...await this.getGitConfig(),
      ...cmd
    })
    return status
  }

  async add(cmd) {
    await git.add({
      ...await this.getGitConfig(),
      ...cmd
    })
    this.emit('add')
  }

  async rm(cmd) {
    await git.remove({
      ...await this.getGitConfig(),
      ...cmd
    })
    this.emit('rm')
  }

  async checkout(cmd, refresh = true) {
    await git.checkout({
      ...await this.getGitConfig(),
      ...cmd
    })
    if (refresh) {
      setTimeout(async () => {
        await this.call('fileManager', 'refresh')
      }, 1000)
    }
    this.emit('checkout')
  }

  async log(cmd) {
    console.log(cmd)
    const status = await git.log({
      ...await this.getGitConfig(),
      ...cmd,
    })
    console.log(status)
    const tree = await git.readTree({
      ...await this.getGitConfig(),
      oid: status[0].oid
    })
    console.log('tree', tree)
    //this.getCommitChanges(status[0].oid, status[1].oid)
    return status
  }

  async getCommitChanges(commitHash1, commitHash2): Promise<commitChange[]> {
    console.log([git.TREE({ ref: commitHash1 }), git.TREE({ ref: commitHash2 })])
    const result: commitChange[] = await git.walk({
      ...await this.getGitConfig(),
      trees: [git.TREE({ ref: commitHash1 }), git.TREE({ ref: commitHash2 })],
      map: async function (filepath, [A, B]) {
        // ignore directories

        console.log(filepath, A, B)

        if (filepath === '.') {
          return
        }
        try {
          if ((A && await A.type()) === 'tree' || B && (await B.type()) === 'tree') {
            return
          }
        } catch (e) {
          // ignore
        }

        // generate ids
        const Aoid = A && await A.oid() || undefined
        const Boid = B && await B.oid() || undefined

        const commitChange: Partial<commitChange> = {
          hashModified: commitHash1,
          hashOriginal: commitHash2,
          path: filepath,
        }

        // determine modification type
        if (Aoid !== Boid) {
          commitChange.type = "modified"
        }
        if (Aoid === undefined) {
          commitChange.type = "deleted"
        }
        if (Boid === undefined || Aoid === Boid) {
          commitChange.type = "added"
        }
        if (Aoid === undefined && Boid === undefined) {
          commitChange.type = "unknown"
        }
        if (commitChange.type)
          return commitChange
        else
          return undefined
      },
    })
    console.log(result)
    return result
  }

  async remotes(config) {
    let remotes:remote[] = []
    try {
      remotes = await git.listRemotes({ ...config ? config : await this.getGitConfig() })
    } catch (e) {
      // do nothing
    }
    return remotes
  }

  async branch(cmd, refresh = true) {
    const status = await git.branch({
      ...await this.getGitConfig(),
      ...cmd
    })
    if (refresh) {
      setTimeout(async () => {
        await this.call('fileManager', 'refresh')
      }, 1000)
    }
    this.emit('branch')
    return status
  }

  async currentbranch(config) {
    try {
      const defaultConfig = await this.getGitConfig()
      const cmd = config ? defaultConfig ? { ...defaultConfig, ...config } : config : defaultConfig
      const name = await git.currentBranch(cmd)

      return name
    } catch (e) {
      return ''
    }
  }

  async branches(config) {
    try {
      const defaultConfig = await this.getGitConfig()
      const cmd = config ? defaultConfig ? { ...defaultConfig, ...config } : config : defaultConfig
      const remotes = await this.remotes(config)
      let branches = []
      branches = (await git.listBranches(cmd)).map((branch) => { return { remote: undefined, name: branch } })
      for (const remote of remotes) {
        cmd.remote = remote.remote
        const remotebranches = (await git.listBranches(cmd)).map((branch) => { return { remote: remote, name: branch } })
        branches = [...branches, ...remotebranches]
      }
      console.log(branches)
      return branches
    } catch (e) {
      return []
    }
  }

  async commit(cmd) {
    await this.init()
    try {
      const sha = await git.commit({
        ...await this.getGitConfig(),
        ...cmd
      })
      this.emit('commit')
      return sha
    } catch (e) {
      throw new Error(e)
    }
  }

  async lsfiles(cmd) {
    const filesInStaging = await git.listFiles({
      ...await this.getGitConfig(),
      ...cmd
    })
    return filesInStaging
  }

  async resolveref(cmd) {
    const oid = await git.resolveRef({
      ...await this.getGitConfig(),
      ...cmd
    })
    return oid
  }

  async readblob(cmd) {
    const readBlobResult: ReadBlobResult = await git.readBlob({
      ...await this.getGitConfig(),
      ...cmd
    })
    return readBlobResult
  }

  async setIpfsConfig(config) {
    this.ipfsconfig = config
    return new Promise((resolve) => {
      resolve(this.checkIpfsConfig())
    })
  }

  async checkIpfsConfig(config?) {
    this.ipfs = IpfsHttpClient(config || this.ipfsconfig)
    try {
      await this.ipfs.config.getAll()
      return true
    } catch (e) {
      return false
    }
  }

  async addremote(input) {
    await git.addRemote({ ...await this.getGitConfig(), url: input.url, remote: input.remote })
  }

  async delremote(input) {
    await git.deleteRemote({ ...await this.getGitConfig(), remote: input.remote })
  }

  async localStorageUsed() {
    return this.calculateLocalStorage()
  }

  async clone(input, workspaceName, workspaceExists = false) {
    const permission = await this.askUserPermission('clone', 'Import multiple files into your workspaces.')
    if (!permission) return false
    if (parseFloat(this.calculateLocalStorage()) > 10000) throw new Error('The local storage of the browser is full.')
    if (!workspaceExists) await this.call('filePanel', 'createWorkspace', workspaceName || `workspace_${Date.now()}`, true)
    const cmd = {
      url: input.url,
      singleBranch: input.singleBranch,
      ref: input.branch,
      depth: input.depth || 10,
      ...await this.parseInput(input),
      ...await this.getGitConfig()
    }

    console.log(cmd)

    const result = await git.clone(cmd)
    if (!workspaceExists) {
      setTimeout(async () => {
        await this.call('fileManager', 'refresh')
      }, 1000)
    }
    this.emit('clone')
    return result
  }

  async push(input) {
    const cmd = {
      force: input.force,
      ref: input.ref,
      remoteRef: input.remoteRef,
      remote: input.remote,
      author: {
        name: input.name,
        email: input.email
      },
      ...await this.parseInput(input),
      ...await this.getGitConfig()
    }
    return await git.push(cmd)
  }

  async pull(input) {
    const cmd = {
      ref: input.ref,
      remoteRef: input.remoteRef,
      author: {
        name: input.name,
        email: input.email
      },
      remote: input.remote,
      ...await this.parseInput(input),
      ...await this.getGitConfig()
    }
    const result = await git.pull(cmd)
    setTimeout(async () => {
      await this.call('fileManager', 'refresh')
    }, 1000)
    return result
  }

  async fetch(input) {
    const cmd = {
      ref: input.ref,
      remoteRef: input.remoteRef,
      author: {
        name: input.name,
        email: input.email
      },
      remote: input.remote,
      ...await this.parseInput(input),
      ...await this.getGitConfig()
    }
    const result = await git.fetch(cmd)
    setTimeout(async () => {
      await this.call('fileManager', 'refresh')
    }, 1000)
    return result
  }

  async repositories(input: { token: string }) {
    const octokit = new Octokit({
      auth: input.token
    })

    const data = await octokit.request('GET /user/repos{?visibility,affiliation,type,sort,direction,per_page,page,since,before}', {
      sort: "pushed",
      direction: "desc",
      per_page: 100,
      affiliation: "owner,collaborator"
    })
    return data.data
  }

  async remotebranches(input: { owner: string, repo: string, token: string }) {
    const octokit = new Octokit({
      auth: input.token
    })

    const data = await octokit.request('GET /repos/{owner}/{repo}/branches{?protected,per_page,page}', {
      owner: input.owner,
      repo: input.repo,
    })
    return data.data
  }


  async export(config) {
    if (!this.checkIpfsConfig(config)) return false
    const workspace = await this.call('filePanel', 'getCurrentWorkspace')
    const files = await this.getDirectory('/')
    this.filesToSend = []
    for (const file of files) {
      const c = await window.remixFileSystem.readFile(`${workspace.absolutePath}/${file}`, null)
      const ob = {
        path: file,
        content: c
      }
      this.filesToSend.push(ob)
    }
    const addOptions = {
      wrapWithDirectory: true
    }
    const r = await this.ipfs.add(this.filesToSend, addOptions)
    return r.cid.string
  }


  async importIPFSFiles(config, cid, workspace) {
    const ipfs = IpfsHttpClient(config)
    let result = false
    try {
      const data = ipfs.get(cid, { timeout: 60000 })
      for await (const file of data) {
        if (file.path) result = true
        file.path = file.path.replace(cid, '')
        if (!file.content) {
          continue
        }
        const content = []
        for await (const chunk of file.content) {
          content.push(chunk)
        }
        const dir = path.dirname(file.path)
        try {
          await this.createDirectories(`${workspace.absolutePath}/${dir}`)
        } catch (e) { throw new Error(e) }
        try {
          await window.remixFileSystem.writeFile(`${workspace.absolutePath}/${file.path}`, Buffer.concat(content) || new Uint8Array(), null)
        } catch (e) { throw new Error(e) }
      }
    } catch (e) {
      throw new Error(e)
    }
    return result
  }

  calculateLocalStorage() {
    let _lsTotal = 0
    let _xLen; let _x
    for (_x in localStorage) {
      // eslint-disable-next-line no-prototype-builtins
      if (!localStorage.hasOwnProperty(_x)) {
        continue
      }
      _xLen = ((localStorage[_x].length + _x.length) * 2)
      _lsTotal += _xLen
    }
    return (_lsTotal / 1024).toFixed(2)
  }

  async import(cmd) {
    const permission = await this.askUserPermission('import', 'Import multiple files into your workspaces.')
    if (!permission) return false
    if (parseFloat(this.calculateLocalStorage()) > 10000) throw new Error('The local storage of the browser is full.')
    const cid = cmd.cid
    await this.call('filePanel', 'createWorkspace', `workspace_${Date.now()}`, true)
    const workspace = await this.call('filePanel', 'getCurrentWorkspace')
    let result
    if (cmd.local) {
      result = await this.importIPFSFiles(this.ipfsconfig, cid, workspace)
    } else {
      result = await this.importIPFSFiles(this.remixIPFS, cid, workspace) || await this.importIPFSFiles(this.ipfsconfig, cid, workspace) || await this.importIPFSFiles(this.globalIPFSConfig, cid, workspace)
    }
    setTimeout(async () => {
      await this.call('fileManager', 'refresh')
    }, 1000)
    if (!result) throw new Error(`Cannot pull files from IPFS at ${cid}`)
  }

  async getItem(name) {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(name)
    }
  }

  async setItem(name, content) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(name, content)
      }
    } catch (e) {
      console.log(e)
      return false
    }
    return true
  }

  async zip() {
    const zip = new JSZip()
    const workspace = await this.call('filePanel', 'getCurrentWorkspace')
    const files = await this.getDirectory('/')
    this.filesToSend = []
    for (const file of files) {
      const c = await window.remixFileSystem.readFile(`${workspace.absolutePath}/${file}`, null)
      zip.file(file, c)
    }
    await zip.generateAsync({
      type: 'blob'
    })
      .then(function (content) {
        saveAs(content, `${workspace.name}.zip`)
      })
  }

  async createDirectories(strdirectories) {
    const ignore = ['.', '/.', '']
    if (ignore.indexOf(strdirectories) > -1) return false
    const directories = strdirectories.split('/')
    for (let i = 0; i < directories.length; i++) {
      let previouspath = ''
      if (i > 0) previouspath = '/' + directories.slice(0, i).join('/')
      const finalPath = previouspath + '/' + directories[i]
      try {
        if (!await window.remixFileSystem.exists(finalPath)) {
          await window.remixFileSystem.mkdir(finalPath)
        }
      } catch (e) {
        console.log(e)
      }
    }
  }

  async getDirectory(dir) {
    let result = []
    const files = await this.call('fileManager', 'readdir', dir)
    const fileArray = normalize(files)
    for (const fi of fileArray) {
      if (fi) {
        const type = fi.data.isDirectory
        if (type === true) {
          result = [
            ...result,
            ...(await this.getDirectory(
              `${fi.filename}`
            ))
          ]
        } else {
          result = [...result, fi.filename]
        }
      }
    }
    return result
  }
}

const addSlash = (file) => {
  if (!file.startsWith('/')) file = '/' + file
  return file
}

const normalize = (filesList) => {
  const folders = []
  const files = []
  Object.keys(filesList || {}).forEach(key => {
    if (filesList[key].isDirectory) {
      folders.push({
        filename: key,
        data: filesList[key]
      })
    } else {
      files.push({
        filename: key,
        data: filesList[key]
      })
    }
  })
  return [...folders, ...files]
}

module.exports = DGitProvider
