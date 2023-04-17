import { ReadCommitResult } from "isomorphic-git"
import { branch, commitChange, fileStatusResult, remote } from "../types"

export const fileStatus = (files: fileStatusResult[]) => {
    return {
        type: 'FILE_STATUS',
        payload: files
    }
}

export const setCommits = (commits: ReadCommitResult[]) => {
    return {
        type: 'SET_COMMITS',
        payload: commits
    }
}

export const setBranches = (branches: any[]) => {
    return {
        type: 'SET_BRANCHES',
        payload: branches
    }
}

export const setRepos = (repos: any[]) => {
    return {
        type: 'SET_REPOS',
        payload: repos
    }
}

export const setRemoteBranches = (branches: any[]) => {
    return {
        type: 'SET_REMOTE_BRANCHES',
        payload: branches
    }
}


export const setLoading = (loading: boolean) => {
    return {
        type: 'SET_LOADING',
        payload: loading
    }
}

export const setCanUseApp = (canUseApp: boolean) => {
    return {
        type: 'SET_CAN_USE_APP',
        payload: canUseApp
    }
}

export const setRepoName = (reponame: string) => {
    return {
        type: 'SET_REPO_NAME',
        payload: reponame
    }
}

export const setCurrentBranch = (currentBranch: branch) => {
    return {
        type: 'SET_CURRENT_BRANCH',
        payload: currentBranch
    }
}

export const setCanCommit = (canCommit: boolean) => {
    return {
        type: 'SET_CAN_COMMIT',
        payload: canCommit
    }
}

export const setRemotes = (remotes: remote[]) => {
    return {
        type: 'SET_REMOTES',
        payload: remotes
    }
}

export const setUpstream = (upstream: string) => {
    return {
        type: 'SET_UPSTREAM',
        payload: upstream
    }
}

export const setCommitChanges = (commitChanges: commitChange[]) => {
    return {
        type: 'SET_COMMIT_CHANGES',
        payload: commitChanges
    }
}

export const setBranchCommits =({branch, commits}) => {
    return {
        type: 'SET_BRANCH_COMMITS',
        payload: { branch, commits }
    }
}
