import React, { Component } from 'react'

export default class SelectRemoteProjectPanel extends Component {

    renderProjectCard(project) {
        const onClick = () => {
            const { onOpenProject } = this.props
            onOpenProject(project)
        }

        return (
            <div id={`project-${project.id}`} onClick={onClick}>
                <p>{ project.name["en"].translation }</p>
            </div>
        )
    }

    render() {
        const { projects } = this.props

        if( !projects ) return null

        const projectCards = projects.map( (project) => {
            return this.renderProjectCard(project)
        })

        return (
            <div>
                <p>Select Remote Project</p>
                { projectCards }
            </div>
        )
    }
}
