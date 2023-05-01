import { ViewPlugin } from "@remixproject/engine-web";
import { ReadBlobResult, ReadCommitResult } from "isomorphic-git";
import React from "react";
import { fileStatus, setBranchCommits, setBranches, setCanCommit, setCommitChanges, setCommits, setCurrentBranch, setGitHubUser, setLoading, setRateLimit, setRemoteBranches, setRemotes, setRepos, setUpstream } from "../state/payload";
import { GitHubUser, RateLimit, branch, commitChange, gitActionDispatch, statusMatrixType } from '../types';
import { removeSlash } from "../utils";
import { disableCallBacks, enableCallBacks } from "./listeners";
import { AlertModal, ModalTypes } from "@remix-ui/app";
import { gitActionsContext } from "../state/context";
import { gitPluginContext } from "../components/gitui";

export const fileStatuses = [
    ["new,untracked", 0, 2, 0], // new, untracked
    ["added,staged", 0, 2, 2], //
    ["added,staged,with unstaged changes", 0, 2, 3], // added, staged, with unstaged changes
    ["unmodified", 1, 1, 1], // unmodified
    ["modified,unstaged", 1, 2, 1], // modified, unstaged
    ["modified,staged", 1, 2, 2], // modified, staged
    ["modified,staged,with unstaged changes", 1, 2, 3], // modified, staged, with unstaged changes
    ["deleted,unstaged", 1, 0, 1], // deleted, unstaged
    ["deleted,staged", 1, 0, 0],
    //["deleted", 1, 1, 0], // deleted, staged
    ["unmodified", 1, 1, 3],
    ["deleted,not in git", 0, 0, 3],
    ["unstaged,modified", 1, 2, 0]
];

const statusmatrix: statusMatrixType[] = fileStatuses.map((x: any) => {
    return {
        matrix: x.shift().split(","),
        status: x,
    };
});

let plugin: ViewPlugin, dispatch: React.Dispatch<gitActionDispatch>


export const setPlugin = (p: ViewPlugin, dispatcher: React.Dispatch<gitActionDispatch>) => {
    plugin = p
    dispatch = dispatcher
}

export const getBranches = async () => {
    const branches = await plugin.call("dGitProvider", "branches");
    dispatch(setBranches(branches));
}
export const getRemotes = async () => {
    const remotes = await plugin.call("dGitProvider", "remotes" as any);
    console.log('remotes :>>', remotes)
    dispatch(setRemotes(remotes));
}

export const setUpstreamRemote = async (remote: string) => {
    dispatch(setUpstream(remote));
}

export const getFileStatusMatrix = async () => {
    const fileStatusResult = await statusMatrix();
    fileStatusResult.map((m) => {
        statusmatrix.map((sm) => {
            if (JSON.stringify(sm.status) === JSON.stringify(m.status)) {
                //Utils.log(m, sm);
                m.statusNames = sm.matrix;
            }
        });
    });
    //console.log(fileStatusResult);
    dispatch(fileStatus(fileStatusResult));
}

export const getCommits = async () => {
    //Utils.log("get commits");
    try {
        const commits: ReadCommitResult[] = await plugin.call(
            "dGitProvider",
            "log",
            { ref: "HEAD" }
        );
        console.log('commits :>>', commits)
        return commits;
    } catch (e) {
        return [];
    }
}

export const gitlog = async () => {
    let commits = []
    try {
        commits = await getCommits();
    } catch (e) {
    }
    dispatch(setCommits(commits));
    await showCurrentBranch();
}

export const showCurrentBranch = async () => {
    try {
        const branch = await currentBranch();
        const currentcommitoid = await getCommitFromRef("HEAD");


        if (typeof branch === "undefined" || branch.name === "") {
            //toast.warn(`You are in a detached state`);
            plugin.call('notification', 'alert', {
                type: 'warning',
                title: 'You are in a detached state',
            })
            branch.name = `HEAD detached at ${currentcommitoid}`;
            //canCommit = false;
            dispatch(setCanCommit(false));
        } else {
            //canCommit = true;
            dispatch(setCanCommit(true));
            dispatch(setCurrentBranch(branch));
        }
    } catch (e) {
        // show empty branch
    }
}

export const currentBranch = async () => {
    // eslint-disable-next-line no-useless-catch
    try {
        const branch: branch =
            (await plugin.call("dGitProvider", "currentbranch")) || "";
        return branch;
    } catch (e) {
        throw e;
    }
}

export const createBranch = async (name: string = "") => {
    if (name) {
        await plugin.call("dGitProvider", "branch", { ref: name });
        await plugin.call("dGitProvider", "checkout", { ref: name });
    }
}

export const getCommitFromRef = async (ref: string) => {
    const commitOid = await plugin.call("dGitProvider", "resolveref", {
        ref: ref,
    });
    return commitOid;
}

const settingsWarning = async () => {
    const username = await plugin.call('config' as any, 'getAppParameter', 'settings/github-user-name')
    const email = await plugin.call('config' as any, 'getAppParameter', 'settings/github-email')
    if (!username || !email) {
        plugin.call('notification', 'toast', 'Please set your github username and email in the settings')
        return false;
    } else {
        return {
            username,
            email
        };
    }
}

export const commit = async (message: string = "") => {

    try {
        const credentials = await settingsWarning()
        if (!credentials) {
            dispatch(setLoading(false))
            return
        }

        const sha = await plugin.call("dGitProvider", "commit", {
            author: {
                name: credentials.username,
                email: credentials.email,
            },
            message: message,
        });
        plugin.call('notification', 'toast', `Commited: ${sha}`)

    } catch (err) {
        plugin.call('notification', 'toast', `${err}`)
    }

}

export const addall = async () => {
    try {
        await plugin
            .call("dGitProvider", "status", { ref: "HEAD" })
            .then((status) =>
                Promise.all(
                    status.map(([filepath, , worktreeStatus]) =>
                        worktreeStatus
                            ? plugin.call("dGitProvider", "add", {
                                filepath: removeSlash(filepath),
                            })
                            : plugin.call("dGitProvider", "rm", {
                                filepath: removeSlash(filepath),
                            })
                    )
                )
            );
        plugin.call('notification', 'toast', `Added all files to git`)

    } catch (e) {
        plugin.call('notification', 'toast', `${e}`)
    }
}

export const add = async (args: string | undefined) => {
    if (args !== undefined) {
        let filename = args; // $(args[0].currentTarget).data('file')
        let stagingfiles;
        if (filename !== "/") {
            filename = removeSlash(filename);
            stagingfiles = [filename];
        } else {
            await addall();
            return;
        }
        try {
            for (const filepath of stagingfiles) {
                try {
                    await plugin.call("dGitProvider", "add", {
                        filepath: removeSlash(filepath),
                    });
                } catch (e) { }
            }
            plugin.call('notification', 'toast', `Added ${filename} to git`);
        } catch (e) {
            plugin.call('notification', 'toast', `${e}`)
        }
    }
}


const getLastCommmit = async () => {
    try {
        let currentcommitoid = "";
        currentcommitoid = await getCommitFromRef("HEAD");
        return currentcommitoid;
    } catch (e) {
        return false;
    }
}


export const rm = async (args: any) => {
    const filename = args;
    await plugin.call("dGitProvider", "rm", {
        filepath: removeSlash(filename),
    });
    plugin.call('notification', 'toast', `Removed ${filename} from git`)
}


export const checkoutfile = async (filename: string) => {
    const oid = await getLastCommmit();
    if (oid)
        try {
            const commitOid = await plugin.call("dGitProvider", "resolveref", {
                ref: oid,
            });
            const { blob } = await plugin.call("dGitProvider", "readblob", {
                oid: commitOid,
                filepath: removeSlash(filename),
            });
            const original = Buffer.from(blob).toString("utf8");
            //(original, filename);
            await disableCallBacks();
            await plugin.call(
                "fileManager",
                "setFile",
                removeSlash(filename),
                original
            );
            await enableCallBacks();
        } catch (e) {
            plugin.call('notification', 'toast', `No such file`)
        }
}

export const checkout = async (cmd: any) => {
    await disableCallBacks();
    await plugin.call('fileManager', 'closeAllFiles')
    try {
        await plugin.call("dGitProvider", "checkout", cmd);
        gitlog();
    } catch (e) {
        plugin.call('notification', 'toast', `${e}`)
    }
    await enableCallBacks();
}

export const clone = async (url: string, branch: string, depth: number, singleBranch: boolean) => {
    console.log(url, branch, depth, singleBranch)
    dispatch(setLoading(true))
    try {
        await disableCallBacks()
        // get last part of url
        const urlParts = url.split("/");
        const lastPart = urlParts[urlParts.length - 1];
        const repoName = lastPart.split(".")[0];
        // add timestamp to repo name
        const timestamp = new Date().getTime();
        const repoNameWithTimestamp = `${repoName}-${timestamp}`;
        //const token = await tokenWarning();
        const token = await plugin.call('config' as any, 'getAppParameter', 'settings/gist-access-token')
        //if (!token) {
        //    dispatch(setLoading(false))
        //    return
        //} else {
        await plugin.call('dGitProvider' as any, 'clone', { url, branch, token, depth, singleBranch }, repoNameWithTimestamp);
        await enableCallBacks()
        plugin.call('notification', 'toast', `Cloned ${url} to ${repoNameWithTimestamp}`)
        //}
    } catch (e: any) {
        await parseError(e)
    }
    dispatch(setLoading(false))
}

const tokenWarning = async () => {
    const token = await plugin.call('config' as any, 'getAppParameter', 'settings/gist-access-token')
    if (!token) {
        const modalContent: AlertModal = {
            message: 'Please set a token first in the GitHub settings of REMIX',
            title: 'No GitHub token set',
            id: 'no-token-set',
        }
        plugin.call('notification', 'alert', modalContent)
        return false;
    } else {
        return token;
    }
}


const parseError = async (e: any) => {
    // if message conttains 401 Unauthorized, show token warning
    if (e.message.includes('401')) {
        const result = await plugin.call('notification', 'modal', {
            title: 'The GitHub token may be missing or invalid',
            message: 'Please check the GitHub token and try again. Error: 401 Unauthorized',
            okLabel: 'Go to settings',
            cancelLabel: 'Close',
            type: ModalTypes.confirm
        })
        console.log(result)
    }
    // if message contains 404 Not Found, show repo not found
    else if (e.message.includes('404')) {
        await plugin.call('notification', 'modal', {
            title: 'Repository not found',
            message: 'Please check the URL and try again.',
            okLabel: 'Go to settings',
            cancelLabel: 'Close',
            type: ModalTypes.confirm
        })
    }
    // if message contains 403 Forbidden
    else if (e.message.includes('403')) {
        await plugin.call('notification', 'modal', {
            title: 'The GitHub token may be missing or invalid',
            message: 'Please check the GitHub token and try again. Error: 403 Forbidden',
            okLabel: 'Go to settings',
            cancelLabel: 'Close',
            type: ModalTypes.confirm
        })
    } else {
        await plugin.call('notification', 'alert', {
            title: 'Error',
            message: e.message
        })
    }
}




export const repositories = async () => {
    try {
        const token = await tokenWarning();
        if (token) {
            const repos = await plugin.call('dGitProvider' as any, 'repositories', { token });
            dispatch(setRepos(repos))
        }
    } catch (e) {
        console.log(e)
        plugin.call('notification', 'alert', {
            title: 'Error getting repositories',
            message: `${e.message}: Please check your GitHub token in the GitHub settings.`
        })
    }
}

export const remoteBranches = async (owner: string, repo: string) => {
    try {
        const token = await tokenWarning();
        if (token) {
            const branches = await plugin.call('dGitProvider' as any, 'remotebranches', { token, owner, repo });
            dispatch(setRemoteBranches(branches))
        }
    } catch (e) {
        console.log(e)
        plugin.call('notification', 'alert', {
            title: 'Error',
            message: e.message
        })
    }
}

export const getGitHubUser = async () => {
    try {
        const token = await tokenWarning();
        if (token) {
            const data: {
                user: GitHubUser,
                ratelimit: RateLimit
            } = await plugin.call('dGitProvider' as any, 'getGitHubUser', { token });

            console.log('GET USER"', data)

            dispatch(setGitHubUser(data.user))
            dispatch(setRateLimit(data.ratelimit))
        }
    } catch (e) {
        console.log(e)
    }
}



export const statusMatrix = async () => {
    const matrix = await plugin.call("dGitProvider", "status", { ref: "HEAD" });
    const result = (matrix || []).map((x) => {
        return {
            filename: `/${x.shift()}`,
            status: x,
        };
    });
    return result;
}

export const diffFiles = async (filename: string | undefined) => {

}

export const resolveRef = async (ref: string) => {
    const oid = await plugin.call("dGitProvider", "resolveref", {
        ref,
    });
    return oid;
}

export const diff = async (commitChange: commitChange) => {

    if (!commitChange.hashModified) {
        const newcontent = await plugin.call(
            "fileManager",
            "readFile",//
            removeSlash(commitChange.path)
        );
        commitChange.modified = newcontent;
        commitChange.readonly = false;

    } else {

        try {
            const modifiedContentReadBlobResult: ReadBlobResult = await plugin.call("dGitProvider", "readblob", {
                oid: commitChange.hashModified,
                filepath: removeSlash(commitChange.path),
            });

            const modifiedContent = Buffer.from(modifiedContentReadBlobResult.blob).toString("utf8");
            console.log(modifiedContent)
            commitChange.modified = modifiedContent;
            commitChange.readonly = true;
        } catch (e) {
            commitChange.modified = "";
        }
    }

    try {
        const originalContentReadBlobResult: ReadBlobResult = await plugin.call("dGitProvider", "readblob", {
            oid: commitChange.hashOriginal,
            filepath: removeSlash(commitChange.path),
        });

        const originalContent = Buffer.from(originalContentReadBlobResult.blob).toString("utf8");
        console.log(originalContent)
        commitChange.original = originalContent;
    } catch (e) {
        commitChange.original = "";
    }




    /*
    const fullfilename = args; // $(args[0].currentTarget).data('file')
    try {
      const commitOid = await client.call(
        "dGitProvider",
        "resolveref",
        { ref: "HEAD" }
      );
      
      const { blob } = await client.call("dGitProvider", "readblob", {
        oid: commitOid,
        filepath: removeSlash(fullfilename),
      });

      const newcontent = await client.call(
        "fileManager",
        "readFile",//
        removeSlash(fullfilename)
      );
      

      // Utils.log(original);
      //Utils.log(newcontent);
      //const filediff = createPatch(filename, original, newcontent); // diffLines(original,newcontent)
      ////Utils.log(filediff)
      const filediff: diffObject = {
        originalFileName: fullfilename,
        updatedFileName: fullfilename,
        current: newcontent,
        past: original,
      };

      return filediff;
    } catch (e) {
      

      const filediff: diffObject = {
        originalFileName: "",
        updatedFileName: "",
        current: "",
        past: "",
      };
      return filediff;
    }
    */
}

export const getCommitChanges = async (oid1: string, oid2: string) => {
    const result: commitChange[] = await plugin.call('dGitProvider', 'getCommitChanges', oid1, oid2)
    dispatch(setCommitChanges(result))
    return result
}

export const fetchBranch = async (branch: branch) => {
    const r = await plugin.call('dGitProvider', 'fetch', {
        ref: branch.name,
        remoteRef: branch.name,
        singleBranch: true,
        remote: branch.remote.remote
    })
    const commits: ReadCommitResult[] = await plugin.call('dGitProvider', 'log', {
        ref: r.fetchHead
    })
    console.log(r, commits)
    dispatch(setBranchCommits({ branch, commits }))
}

export const getBranchCommits = async (branch: branch) => {
    try {
        console.log(branch)
        const commits: ReadCommitResult[] = await plugin.call('dGitProvider', 'log', {
            ref: branch.name,
        })
        console.log(commits)
        dispatch(setBranchCommits({ branch, commits }))
        return commits
    } catch (e) {
        console.log(e)
        await fetchBranch(branch)
    }
}
