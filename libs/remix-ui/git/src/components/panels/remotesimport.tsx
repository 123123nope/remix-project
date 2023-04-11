import React, { useEffect, useState } from "react";
import { Alert, Button } from "react-bootstrap";
import { gitActionsContext } from "../../state/context";
import { repository } from "../../types";
import { gitPluginContext } from "../gitui";
import Select from 'react-select'
import { selectStyles, selectTheme } from "../../types/styles";


export const RemotesImport = () => {
  const context = React.useContext(gitPluginContext)
  const actions = React.useContext(gitActionsContext)
  const [repo, setRepo] = useState<repository>(null);
  const [repoOtions, setRepoOptions] = useState<any>([]);
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [remoteName, setRemoteName] = useState('')

  useEffect(() => {
    console.log('context', context.repositories)
    // map context.repositories to options
    const options = context.repositories && context.repositories.length > 0 && context.repositories.map(repo => {
      return { value: repo.id, label: repo.full_name }
    })
    setLoading(false)
    setRepoOptions(options)

  }, [context.repositories])



  const fetchRepositories = async () => {
    try {
      setShow(true)
      setLoading(true)
      setRepoOptions([])
      console.log(await actions.repositories())
    } catch (e) {
      // do nothing
    }
  };

  const selectRepo = async (value: number | string) => {
    // find repo
    console.log('setRepo', value, context.repositories)

    const repo = context.repositories.find(repo => {
      return repo.id.toString() === value.toString()
    })
    console.log('repo', repo)
    if (repo) {
      setRepo(repo)
    }
  }

  const addRemote = async () => {
    try {

    } catch (e) {
      // do nothing
    }

  };
  const onRemoteNameChange = (value: string) => {
    setRemoteName(value)
  }

  return (
    <>
      <Button onClick={fetchRepositories} className="w-100 mt-1">
        <i className="fab fa-github mr-1"></i>Fetch Remotes from GitHub
      </Button>
      {show ?
        <Select
          options={repoOtions}
          className="mt-1"
          onChange={(e: any) => e && selectRepo(e.value)}
          theme={selectTheme}
          styles={selectStyles}
          isClearable={true}
          placeholder="Type to search for a repository..."
          isLoading={loading}
        /> : null}

      {repo ?
        <input placeholder="remote name" name='remotename' onChange={e => onRemoteNameChange(e.target.value)} value={remoteName} className="form-control mb-2" type="text" id="remotename" />
        : null}



      {repo && remoteName ?
        <button data-id='clonebtn' className='btn btn-primary mt-1 w-100' onClick={async () => {
          await addRemote()
        }}>add {remoteName}:{repo.full_name}</button> : null}

    </>
  )
}


