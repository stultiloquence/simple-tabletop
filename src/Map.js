import './Map.css';
import React from 'react'
import update from 'immutability-helper'

const toCSSUnits = (coordinate) => 3 * coordinate + "em"

class Tile extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			dropHover: false
		}
	}

	render () {
		const location = { x: this.props.x, y: this.props.y }
		return (
			<div
				className={"tile" + (this.state.dropHover ? " dropHover" : "")}
				style={{
					left: toCSSUnits(this.props.x),
					top: toCSSUnits(this.props.y),	
				}}
				onClick={(e) => this.props.onClick(location, e)}
				onDragOver={(e) => { 
					e.stopPropagation()
					e.preventDefault()
				}}
				onDrop={(e) => {
					this.props.onDrop(location, e)
					this.setState({ dropHover: false })
					e.stopPropagation()
					e.preventDefault()
				}}
				onDragEnter={(e) => {
					this.setState({ dropHover: true })
					e.stopPropagation()
					e.preventDefault()
				}}
				onDragLeave={(e) => {
					this.setState({ dropHover: false })
					e.stopPropagation()
					e.preventDefault()
				}}
				>
			</div>
		)
	}
}

class Entity extends React.Component {
	constructor (props) {
		super(props)
	}

	render () {
		return (
			<div
				className={"entity " + this.props.entity.type + (this.props.selected ? " selected" : "")}
				draggable="true"
				style={{
					left: toCSSUnits(this.props.entity.x),
					top: toCSSUnits(this.props.entity.y),	
				}}
				onClick={(e) => {
					this.props.onClick(this.props.entity, e)
				}}
				onDragStart={(e) => {
					e.dataTransfer.dropEffect = "move"
					this.props.onDragStart(this.props.entity, e)
				}}>
			</div>
		)
	}
}

class Map extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			selected: null,
			entities: {
				"pc 1": { x: 2, y: 3, id: "pc 1", type: "pc-one" },
				"pc 2": { x: 3, y: 5, id: "pc 2", type: "pc-two" },
				"npc 1": { x: 0, y: 7, id: "npc 1", type: "npc-one" },
			},
		}
		this.select = this.select.bind(this)
		this.toggleSelect = this.toggleSelect.bind(this)
		this.moveSelectedTo = this.moveSelectedTo.bind(this)
		this.handleKeyPress = this.handleKeyPress.bind(this)
		
		this.tiles = Array.from({ length: props.width }, (_, i) =>
			Array.from({ length: props.height }, (_, j) =>
				<Tile
					key={i + ":" + j}
					x={i} y={j}
					onClick={this.moveSelectedTo}
					onDrop={this.moveSelectedTo}/>))
	}

	move (state, entityId, destination) {
		const x = Math.max(0, Math.min(this.props.width - 1, destination.x))
		const y = Math.max(0, Math.min(this.props.height - 1, destination.y))
		return update(state, {
			entities: { [entityId]: { $merge: { x, y } } }
		})
	}

	moveSelectedTo (point) {
		if (this.state.selected === null) return
		this.setState(state => this.move(state, this.state.selected, point))
	}

	toggleSelect (entity) {
		this.setState(state => ({ selected: state.selected === entity.id ? null : entity.id }))
	}

	select (entity) {
		this.setState({ selected: entity.id })
	}

	handleKeyPress (e) {
		if (this.state.selected === null) return
		const origin = this.state.entities[this.state.selected]
		let destination
		switch (e.key) {
			case "w":
			case "ArrowUp":
				destination = { x: origin.x, y: origin.y - 1 }
				break
			case "a":
			case "ArrowLeft":
				destination = { x: origin.x - 1, y: origin.y }
				break
			case "s":
			case "ArrowDown":
				destination = { x: origin.x, y: origin.y + 1 }
				break
			case "d":
			case "ArrowRight":
				destination = { x: origin.x + 1, y: origin.y }
				break
			default:
				return
		}
		this.setState(state => this.move(state, this.state.selected, destination))
	}
	
	componentDidMount() {
		document.addEventListener("keydown", this.handleKeyPress);
	}

	componentWillUnmount() {
		document.removeEventListener("keydown", this.handleKeyPress);
	}

	render () {
		const entities = Object.values(this.state.entities).map(entity => (<Entity
			key={entity.id}
			entity={entity}
			onClick={this.toggleSelect}
			onDragStart={this.select}
			selected={this.state.selected === entity.id}/>))

		return (
			<div
				className={"map" + (this.state.selected ? " selectable" : "")}
				onKeyPress={this.handleKeyPress}>
				{ [...this.tiles, ...entities] }
			</div>
		)	
	}
}

export default Map;
