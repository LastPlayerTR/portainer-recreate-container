import * as core from '@actions/core'
import fetch from 'node-fetch'
/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const portainerHost: string = core.getInput('portainer-host', {
      required: true
    })
    const username: string = core.getInput('username', {
      required: true
    })
    const password: string = core.getInput('password', {
      required: true
    })
    const containerName: string = core.getInput('containerName', {
      required: true
    })
    core.setSecret(password)
    core.info(`Portainer Host: ${portainerHost}`)
    const authResponse = await fetch(`${portainerHost}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    })
    if (!authResponse.ok) {
      throw new Error(
        `Failed to authenticate with Portainer: ${authResponse.statusText}`
      )
    }
    const authData: any = await authResponse.json()
    const token = authData.jwt
    core.setSecret(token)
    const containersResponse = await fetch(
      `${portainerHost}/api/endpoints/3/docker/v1.41/containers/json?all=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    if (!containersResponse.ok) {
      throw new Error(
        `Failed to get containers from Portainer: ${containersResponse.statusText}`
      )
    }
    const containersData: any = await containersResponse.json()
    core.info(containersData)
    const container = containersData.find((container: any) =>
      container.Names.includes(`/${containerName}`)
    )
    if (!container) {
      throw new Error(`Container not found: ${containerName}`)
    }

    const containerId = container.Id
    core.info(`Container ID: ${containerId}`)

    const recreateResponse = await fetch(
      `${portainerHost}/api/endpoints/3/docker/containers/${containerId}/recreate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ PullImage: true })
      }
    )

    if (!recreateResponse.ok) {
      throw new Error(
        `Failed to recreate container: ${recreateResponse.statusText}`
      )
    }

    core.info(`Recreated container: ${containerName}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
