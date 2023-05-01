import { Endpoints } from "@octokit/types"
import { CommitObject, ReadCommitResult } from "isomorphic-git"

export type GitHubUser = Endpoints["GET /user"]["response"]['data']
export type RateLimit = Endpoints["GET /rate_limit"]["response"]["data"]

export type gitState = {
    currentBranch: branch
    commits: ReadCommitResult[]
    branch: string
    canCommit: boolean
    branches: branch[]
    remotes: remote[]
    fileStatusResult: fileStatusResult[]
    canUseApp: boolean
    loading: boolean
    storageUsed: any
    reponame: string
    staged: fileStatusResult[]
    untracked: fileStatusResult[]
    deleted: fileStatusResult[]
    modified: fileStatusResult[]
    allchangesnotstaged: fileStatusResult[],
    repositories: repository[]
    remoteBranches: remoteBranch[]
    commitChanges: commitChange[]
    branchCommits:  Record<string, ReadCommitResult[]>
    syncStatus: syncStatus,
    localCommitCount: number
    remoteCommitCount: number
    upstream: string
    gitHubUser: GitHubUser
    rateLimit: RateLimit
    gitHubAccessToken: string
}

export type commitChangeTypes = {  
    "deleted": "D"
    "modified": "M"
    "added": "A",
    "unknown": "?"
}

export enum syncStatus {
    "sync" = "sync",
    "publishBranch" = "publishBranch",
    "none" = "none",
}

export type commitChangeType = keyof commitChangeTypes

export type commitChange = {
    type: commitChangeType
    path: string,
    hashModified : string,
    hashOriginal : string,
    original?: string,
    modified?: string,
    readonly?: boolean
}

export type repository = {
    name: string
    html_url: string
    owner: {
        login: string
    },
    full_name: string
    default_branch: string
    id: number
}

export type branch = {
    name: string
    remote: remote
}

export type remote = {
    remote: string
    url: string
}

export type remoteBranch = {
    name: string
}

export const defaultGitState: gitState = {
    currentBranch: { name: "", remote: { remote: "", url: "" } },
    commits: [],
    branch: "",
    canCommit: true,
    branches: [],
    remotes: [],
    fileStatusResult: [],
    staged: [],
    untracked: [],
    deleted: [],
    modified: [],
    allchangesnotstaged: [],
    canUseApp: false,
    loading: false,
    storageUsed: {},
    reponame: "",
    repositories: [],
    remoteBranches: [],
    commitChanges: [],
    branchCommits: {},
    syncStatus: syncStatus.none,
    localCommitCount: 0,
    remoteCommitCount: 0,
    upstream: "",
    gitHubUser: {} as GitHubUser,
    rateLimit: {} as RateLimit,
    gitHubAccessToken: ""
}

export type fileStatusResult = {
    filename:string,
    status?: fileStatus
    statusNames?:string[]
}

export type fileStatus =[string, 0 | 1, 0 | 1 | 2, 0 | 1 | 2 | 3]

export type statusMatrixType = { matrix: string[] | undefined; status: string[] }

export type sourceControlGroup = {
    group: fileStatusResult[],
    name: string
}

export interface fileStatusAction  {
    type: string,
    payload: fileStatusResult[]
}

export interface setCommitsAction {
    type: string,
    payload: ReadCommitResult[]
}

export interface setBranchesAction {
    type: string,
    payload: any[]
}

export interface setReposAction {
    type: string,
    payload: any[]
}

export interface setRemoteBranchesAction {
    type: string,
    payload: any[]
}

export interface setGitHubUserAction {
    type: string,
    payload: any
}

export interface setLoadingAction {
    type: string,
    payload: boolean
}

export interface setCanUseAppAction {
    type: string,
    payload: boolean
}

export interface setRepoNameAction {
    type: string,
    payload: string
}

export interface setCurrentBranchAction {
    type: string,
    payload: branch
}

export interface setRemotesAction {
    type: string,
    payload: remote[]
}

export interface setUpstreamAction {
    type: string,
    payload: string
}

export interface setBranchCommitsAction {
    type: string,
    payload: {
        branch: branch,
        commits: ReadCommitResult[]
    }
}

export type gitActionDispatch = setUpstreamAction | setBranchCommitsAction | setRemotesAction | setCurrentBranchAction | fileStatusAction | setLoadingAction | setCanUseAppAction | setRepoNameAction | setCommitsAction | setBranchesAction | setReposAction | setRemoteBranchesAction