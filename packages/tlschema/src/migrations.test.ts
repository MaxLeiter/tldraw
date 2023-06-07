import { Migrations, Store, createRecordType } from '@tldraw/store'
import fs from 'fs'
import { imageAssetMigrations } from './assets/TLImageAsset'
import { videoAssetMigrations } from './assets/TLVideoAsset'
import { documentMigrations } from './records/TLDocument'
import { instanceMigrations, instanceTypeVersions } from './records/TLInstance'
import { instancePageStateMigrations, instancePageStateVersions } from './records/TLPageState'
import { instancePresenceMigrations, instancePresenceVersions } from './records/TLPresence'
import { TLShape, rootShapeMigrations, Versions as rootShapeVersions } from './records/TLShape'
import { storeMigrations, storeVersions } from './store-migrations'

const assetModules = fs
	.readdirSync('src/assets')
	.filter((n) => n.match(/^TL.*\.ts$/))
	.map((f) => [f, require(`./assets/${f.slice(0, -3)}`)])
const recordModules = fs
	.readdirSync('src/records')
	.filter((n) => n.match(/^TL.*\.ts$/))
	.map((f) => [f, require(`./records/${f.slice(0, -3)}`)])

const allModules = [
	...assetModules,
	...recordModules,
	['store-migrations.ts', require('./store-migrations')],
]

const allMigrators: Array<{
	fileName: string
	version: number
	up: jest.SpyInstance
	down: jest.SpyInstance
}> = []

for (const [fileName, module] of allModules) {
	const migrationsKey = Object.keys(module).find((k) => k.endsWith('igrations'))

	if (!migrationsKey) continue

	const migrations: Migrations = module[migrationsKey]

	for (const version of Object.keys(migrations.migrators)) {
		const originalUp = migrations.migrators[version as any].up
		const originalDown = migrations.migrators[version as any].down
		const up = jest
			.spyOn(migrations.migrators[version as any], 'up')
			.mockImplementation((initialRecord) => {
				if (initialRecord instanceof Store) return originalUp(initialRecord)

				const clonedRecord = structuredClone(initialRecord)
				const result = originalUp(initialRecord)
				// mutations should never mutate their input
				expect(initialRecord).toEqual(clonedRecord)
				return result
			})
		const down = jest
			.spyOn(migrations.migrators[version as any], 'down')
			.mockImplementation((initialRecord) => {
				if (initialRecord instanceof Store) return originalDown(initialRecord)

				const clonedRecord = structuredClone(initialRecord)
				const result = originalDown(initialRecord)
				// mutations should never mutate their input
				expect(initialRecord).toEqual(clonedRecord)
				return result
			})
		allMigrators.push({
			fileName,
			version: Number(version),
			up,
			down,
		})
	}
}

test('all modules export migrations', () => {
	const modulesWithoutMigrations = allModules
		.filter(([, module]) => {
			return !Object.keys(module).find((k) => k.endsWith('igrations'))
		})
		.map(([fileName]) => fileName)
		.filter((n) => !(n === 'TLBaseAsset.ts' || n === 'TLBaseShape.ts' || n === 'TLRecord.ts'))

	// IF THIS LINE IS FAILING YOU NEED TO MAKE SURE THE MIGRATIONS ARE EXPORTED
	expect(modulesWithoutMigrations).toHaveLength(0)
})

/* ---  PUT YOUR MIGRATIONS TESTS BELOW HERE --- */

describe('TLVideoAsset AddIsAnimated', () => {
	const oldAsset = {
		id: '1',
		type: 'video',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'video',
			width: 100,
			height: 100,
			mimeType: 'video/mp4',
		},
	}

	const newAsset = {
		id: '1',
		type: 'video',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'video',
			width: 100,
			height: 100,
			mimeType: 'video/mp4',
			isAnimated: false,
		},
	}

	const { up, down } = videoAssetMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up(oldAsset)).toEqual(newAsset)
	})
	test('down works as expected', () => {
		expect(down(newAsset)).toEqual(oldAsset)
	})
})

describe('TLImageAsset AddIsAnimated', () => {
	const oldAsset = {
		id: '1',
		type: 'image',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'image',
			width: 100,
			height: 100,
			mimeType: 'image/gif',
		},
	}

	const newAsset = {
		id: '1',
		type: 'image',
		props: {
			src: 'https://www.youtube.com/watch?v=1',
			name: 'image',
			width: 100,
			height: 100,
			mimeType: 'image/gif',
			isAnimated: false,
		},
	}

	const { up, down } = imageAssetMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up(oldAsset)).toEqual(newAsset)
	})
	test('down works as expected', () => {
		expect(down(newAsset)).toEqual(oldAsset)
	})
})

const ShapeRecord = createRecordType('shape', {
	validator: { validate: (record) => record as TLShape },
	scope: 'document',
})

describe('Store removing Icon and Code shapes', () => {
	test('up works as expected', () => {
		const snapshot = Object.fromEntries(
			[
				ShapeRecord.create({
					type: 'icon',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'a' },
				} as any),
				ShapeRecord.create({
					type: 'icon',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'b' },
				} as any),
				ShapeRecord.create({
					type: 'code',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'c' },
				} as any),
				ShapeRecord.create({
					type: 'code',
					parentId: 'page:any',
					index: 'a0',
					props: { name: 'd' },
				} as any),
				ShapeRecord.create({
					type: 'geo',
					parentId: 'page:any',
					index: 'a0',
					props: { geo: 'rectangle', w: 1, h: 1, growY: 1, text: '' },
				} as any),
			].map((shape) => [shape.id, shape])
		)
		const fixed = storeMigrations.migrators[storeVersions.RemoveCodeAndIconShapeTypes].up(snapshot)
		expect(Object.entries(fixed)).toHaveLength(1)
	})

	test('down works as expected', () => {
		const snapshot = Object.fromEntries(
			[
				ShapeRecord.create({
					type: 'geo',
					parentId: 'page:any',
					index: 'a0',
					props: { geo: 'rectangle', name: 'e', w: 1, h: 1, growY: 1, text: '' },
				} as any),
			].map((shape) => [shape.id, shape])
		)

		storeMigrations.migrators[storeVersions.RemoveCodeAndIconShapeTypes].down(snapshot)
		expect(Object.entries(snapshot)).toHaveLength(1)
	})
})

describe('Adding export background', () => {
	const { up, down } = instanceMigrations.migrators[1]
	test('up works as expected', () => {
		const before = {}
		const after = { exportBackground: true }
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = { exportBackground: true }
		const after = {}
		expect(down(before)).toStrictEqual(after)
	})
})

describe('Removing dialogs from instance', () => {
	const { up, down } = instanceMigrations.migrators[2]
	test('up works as expected', () => {
		const before = { dialog: null }
		const after = {}
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = {}
		const after = { dialog: null }
		expect(down(before)).toStrictEqual(after)
	})
})

describe('Renaming asset props', () => {
	for (const [name, { up, down }] of [
		['image shape', imageAssetMigrations.migrators[2]],
		['video shape', videoAssetMigrations.migrators[2]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			const before = { props: { width: 100, height: 100 } }
			const after = { props: { w: 100, h: 100 } }
			expect(up(before)).toStrictEqual(after)
		})

		test(`${name}: down works as expected`, () => {
			const before = { props: { w: 100, h: 100 } }
			const after = { props: { width: 100, height: 100 } }
			expect(down(before)).toStrictEqual(after)
		})
	}
})

describe('Adding instance.isToolLocked', () => {
	const { up, down } = instanceMigrations.migrators[3]
	test('up works as expected', () => {
		expect(up({})).toMatchObject({ isToolLocked: false })
		expect(up({ isToolLocked: true })).toMatchObject({ isToolLocked: false })
	})

	test('down works as expected', () => {
		expect(down({ isToolLocked: true })).toStrictEqual({})
		expect(down({ isToolLocked: false })).toStrictEqual({})
	})
})

describe('Cleaning up junk data in instance.propsForNextShape', () => {
	const { up, down } = instanceMigrations.migrators[4]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red', unknown: 'gone' } })).toEqual({
			propsForNextShape: {
				color: 'red',
			},
		})
	})

	test('down works as expected', () => {
		const instance = { propsForNextShape: { color: 'red' } }
		expect(down(instance)).toBe(instance)
	})
})

describe('Adding isLocked prop', () => {
	const { up, down } = rootShapeMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up({})).toEqual({ isLocked: false })
	})

	test('down works as expected', () => {
		expect(down({ isLocked: false })).toEqual({})
	})
})

describe('Adding labelColor prop to propsForNextShape', () => {
	const { up, down } = instanceMigrations.migrators[5]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red' } })).toEqual({
			propsForNextShape: { color: 'red', labelColor: 'black' },
		})
	})

	test('down works as expected', () => {
		expect(down({ propsForNextShape: { color: 'red', labelColor: 'blue' } })).toEqual({
			propsForNextShape: { color: 'red' },
		})
	})
})

describe('Adding croppingId to instancePageState', () => {
	const { up, down } = instancePageStateMigrations.migrators[1]
	test('up works as expected', () => {
		expect(up({})).toEqual({
			croppingId: null,
		})
	})

	test('down works as expected', () => {
		expect(down({ croppingId: null })).toEqual({})
	})
})

describe('Adding followingUserId prop to instance', () => {
	const { up, down } = instanceMigrations.migrators[6]
	test('up works as expected', () => {
		expect(up({})).toEqual({ followingUserId: null })
	})

	test('down works as expected', () => {
		expect(down({ followingUserId: '123' })).toEqual({})
	})
})

describe('Removing align=justify from propsForNextShape', () => {
	const { up, down } = instanceMigrations.migrators[7]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'black', align: 'justify' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'start' },
		})
		expect(up({ propsForNextShape: { color: 'black', align: 'end' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'end' },
		})
	})

	test('down works as expected', () => {
		expect(down({ propsForNextShape: { color: 'black', align: 'end' } })).toEqual({
			propsForNextShape: { color: 'black', align: 'end' },
		})
	})
})

describe('Adding zoomBrush prop to instance', () => {
	const { up, down } = instanceMigrations.migrators[8]
	test('up works as expected', () => {
		expect(up({})).toEqual({ zoomBrush: null })
	})

	test('down works as expected', () => {
		expect(down({ zoomBrush: { x: 1, y: 2, w: 3, h: 4 } })).toEqual({})
	})
})

describe('Adding instance_presence to the schema', () => {
	const { up, down } = storeMigrations.migrators[storeVersions.AddInstancePresenceType]

	test('up works as expected', () => {
		expect(up({})).toEqual({})
	})
	test('down works as expected', () => {
		expect(
			down({
				'instance_presence:123': { id: 'instance_presence:123', typeName: 'instance_presence' },
				'instance:123': { id: 'instance:123', typeName: 'instance' },
			})
		).toEqual({
			'instance:123': { id: 'instance:123', typeName: 'instance' },
		})
	})
})

describe('Adding name to document', () => {
	const { up, down } = documentMigrations.migrators[1]

	test('up works as expected', () => {
		expect(up({})).toEqual({ name: '' })
	})

	test('down works as expected', () => {
		expect(down({ name: '' })).toEqual({})
	})
})

describe('Add verticalAlign to props for next shape', () => {
	const { up, down } = instanceMigrations.migrators[9]
	test('up works as expected', () => {
		expect(up({ propsForNextShape: { color: 'red' } })).toEqual({
			propsForNextShape: {
				color: 'red',
				verticalAlign: 'middle',
			},
		})
	})

	test('down works as expected', () => {
		const instance = { propsForNextShape: { color: 'red', verticalAlign: 'middle' } }
		expect(down(instance)).toEqual({
			propsForNextShape: {
				color: 'red',
			},
		})
	})
})

describe('Adds delay to scribble', () => {
	const { up, down } = instanceMigrations.migrators[10]

	test('up has no effect when scribble is null', () => {
		expect(
			up({
				scribble: null,
			})
		).toEqual({ scribble: null })
	})

	test('up adds the delay property', () => {
		expect(
			up({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
				delay: 0,
			},
		})
	})

	test('down has no effect when scribble is null', () => {
		expect(down({ scribble: null })).toEqual({ scribble: null })
	})

	test('removes the delay property', () => {
		expect(
			down({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
					delay: 0,
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
			},
		})
	})
})

describe('Adds delay to scribble', () => {
	const { up, down } = instancePresenceMigrations.migrators[1]

	test('up has no effect when scribble is null', () => {
		expect(
			up({
				scribble: null,
			})
		).toEqual({ scribble: null })
	})

	test('up adds the delay property', () => {
		expect(
			up({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
				delay: 0,
			},
		})
	})

	test('down has no effect when scribble is null', () => {
		expect(down({ scribble: null })).toEqual({ scribble: null })
	})

	test('removes the delay property', () => {
		expect(
			down({
				scribble: {
					points: [{ x: 0, y: 0 }],
					size: 4,
					color: 'black',
					opacity: 1,
					state: 'starting',
					delay: 0,
				},
			})
		).toEqual({
			scribble: {
				points: [{ x: 0, y: 0 }],
				size: 4,
				color: 'black',
				opacity: 1,
				state: 'starting',
			},
		})
	})
})

describe('user config refactor', () => {
	test('removes user and user_presence types from snapshots', () => {
		const { up, down } =
			storeMigrations.migrators[storeVersions.RemoveTLUserAndPresenceAndAddPointer]

		const prevSnapshot = {
			'user:123': {
				id: 'user:123',
				typeName: 'user',
			},
			'user_presence:123': {
				id: 'user_presence:123',
				typeName: 'user_presence',
			},
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		const nextSnapshot = {
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		// up removes the user and user_presence types
		expect(up(prevSnapshot)).toEqual(nextSnapshot)
		// down cannot add them back so it should be a no-op
		expect(
			down({
				...nextSnapshot,
				'pointer:134': {
					id: 'pointer:134',
					typeName: 'pointer',
				},
			})
		).toEqual(nextSnapshot)
	})

	test('removes userId from the instance state', () => {
		const { up, down } = instanceMigrations.migrators[instanceTypeVersions.RemoveUserId]

		const prev = {
			id: 'instance:123',
			typeName: 'instance',
			userId: 'user:123',
		}

		const next = {
			id: 'instance:123',
			typeName: 'instance',
		}

		expect(up(prev)).toEqual(next)
		// it cannot be added back so it should add some meaningless id in there
		// in practice, because we bumped the store version, this down migrator will never be used
		expect(down(next)).toMatchInlineSnapshot(`
		Object {
		  "id": "instance:123",
		  "typeName": "instance",
		  "userId": "user:none",
		}
	`)
	})
})

describe('making instance state independent', () => {
	it('adds isPenMode and isGridMode to instance state', () => {
		const { up, down } =
			instanceMigrations.migrators[instanceTypeVersions.AddIsPenModeAndIsGridMode]

		const prev = {
			id: 'instance:123',
			typeName: 'instance',
		}
		const next = {
			id: 'instance:123',
			typeName: 'instance',
			isPenMode: false,
			isGridMode: false,
		}

		expect(up(prev)).toEqual(next)
		expect(down(next)).toEqual(prev)
	})

	it('removes instanceId and cameraId from instancePageState', () => {
		const { up, down } =
			instancePageStateMigrations.migrators[instancePageStateVersions.RemoveInstanceIdAndCameraId]

		const prev = {
			id: 'instance_page_state:123',
			typeName: 'instance_page_state',
			instanceId: 'instance:123',
			cameraId: 'camera:123',
			selectedIds: [],
		}

		const next = {
			id: 'instance_page_state:123',
			typeName: 'instance_page_state',
			selectedIds: [],
		}

		expect(up(prev)).toEqual(next)
		// down should never be called
		expect(down(next)).toMatchInlineSnapshot(`
		Object {
		  "cameraId": "camera:void",
		  "id": "instance_page_state:123",
		  "instanceId": "instance:instance",
		  "selectedIds": Array [],
		  "typeName": "instance_page_state",
		}
	`)
	})

	it('removes instanceId from instancePresence', () => {
		const { up, down } =
			instancePresenceMigrations.migrators[instancePresenceVersions.RemoveInstanceId]

		const prev = {
			id: 'instance_presence:123',
			typeName: 'instance_presence',
			instanceId: 'instance:123',
			selectedIds: [],
		}

		const next = {
			id: 'instance_presence:123',
			typeName: 'instance_presence',
			selectedIds: [],
		}

		expect(up(prev)).toEqual(next)

		// down should never be called
		expect(down(next)).toMatchInlineSnapshot(`
		Object {
		  "id": "instance_presence:123",
		  "instanceId": "instance:instance",
		  "selectedIds": Array [],
		  "typeName": "instance_presence",
		}
	`)
	})

	it('removes userDocument from the schema', () => {
		const { up, down } = storeMigrations.migrators[storeVersions.RemoveUserDocument]

		const prev = {
			'user_document:123': {
				id: 'user_document:123',
				typeName: 'user_document',
			},
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		const next = {
			'instance:123': {
				id: 'instance:123',
				typeName: 'instance',
			},
		}

		expect(up(prev)).toEqual(next)
		expect(down(next)).toEqual(next)
	})
})

describe('hoist opacity', () => {
	test('hoists opacity from a shape to another', () => {
		const { up, down } = rootShapeMigrations.migrators[rootShapeVersions.HoistOpacity]
		const before = {
			type: 'myShape',
			x: 0,
			y: 0,
			props: {
				color: 'red',
				opacity: '0.5',
			},
		}
		const after = {
			type: 'myShape',
			x: 0,
			y: 0,
			opacity: 0.5,
			props: {
				color: 'red',
			},
		}
		const afterWithNonMatchingOpacity = {
			type: 'myShape',
			x: 0,
			y: 0,
			opacity: 0.6,
			props: {
				color: 'red',
			},
		}

		expect(up(before)).toEqual(after)
		expect(down(after)).toEqual(before)
		expect(down(afterWithNonMatchingOpacity)).toEqual(before)
	})

	test('hoists opacity from propsForNextShape', () => {
		const { up, down } = instanceMigrations.migrators[instanceTypeVersions.HoistOpacity]
		const before = {
			isToolLocked: true,
			propsForNextShape: {
				color: 'black',
				opacity: '0.5',
			},
		}
		const after = {
			isToolLocked: true,
			opacityForNextShape: 0.5,
			propsForNextShape: {
				color: 'black',
			},
		}
		const afterWithNonMatchingOpacity = {
			isToolLocked: true,
			opacityForNextShape: 0.6,
			propsForNextShape: {
				color: 'black',
			},
		}

		expect(up(before)).toEqual(after)
		expect(down(after)).toEqual(before)
		expect(down(afterWithNonMatchingOpacity)).toEqual(before)
	})
})

/* ---  PUT YOUR MIGRATIONS TESTS ABOVE HERE --- */

for (const migrator of allMigrators) {
	test(`[${migrator.fileName} v${migrator.version}] up and down migrations have both been tested`, () => {
		expect(migrator.up).toHaveBeenCalled()
		expect(migrator.down).toHaveBeenCalled()
	})
}