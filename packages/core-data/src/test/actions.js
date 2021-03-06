/**
 * WordPress dependencies
 */
import { controls } from '@wordpress/data';

/**
 * Internal dependencies
 */
import {
	editEntityRecord,
	saveEntityRecord,
	deleteEntityRecord,
	receiveEntityRecords,
	receiveUserPermission,
	receiveAutosaves,
	receiveCurrentUser,
} from '../actions';

jest.mock( '../locks/actions', () => ( {
	__unstableAcquireStoreLock: jest.fn( () => [
		{
			type: 'MOCKED_ACQUIRE_LOCK',
		},
	] ),
	__unstableReleaseStoreLock: jest.fn( () => [
		{
			type: 'MOCKED_RELEASE_LOCK',
		},
	] ),
} ) );

describe( 'editEntityRecord', () => {
	it( 'throws when the edited entity does not have a loaded config.', () => {
		const entity = { kind: 'someKind', name: 'someName', id: 'someId' };
		const fulfillment = editEntityRecord(
			entity.kind,
			entity.name,
			entity.id,
			{}
		);
		expect( fulfillment.next().value ).toEqual(
			controls.select( 'core', 'getEntity', entity.kind, entity.name )
		);

		// Don't pass back an entity config.
		expect( fulfillment.next.bind( fulfillment ) ).toThrow(
			`The entity being edited (${ entity.kind }, ${ entity.name }) does not have a loaded config.`
		);
	} );
} );

describe( 'deleteEntityRecord', () => {
	it( 'triggers a DELETE request for an existing record', async () => {
		const post = 10;
		const entities = [
			{ name: 'post', kind: 'postType', baseURL: '/wp/v2/posts' },
		];
		const fulfillment = deleteEntityRecord( 'postType', 'post', post );

		// Trigger generator
		fulfillment.next();

		// Acquire lock
		expect( fulfillment.next( entities ).value.type ).toBe(
			'MOCKED_ACQUIRE_LOCK'
		);

		// Start
		expect( fulfillment.next().value.type ).toEqual(
			'DELETE_ENTITY_RECORD_START'
		);

		// delete api call
		const { value: apiFetchAction } = fulfillment.next();
		expect( apiFetchAction.request ).toEqual( {
			path: '/wp/v2/posts/10',
			method: 'DELETE',
		} );

		expect( fulfillment.next().value.type ).toBe( 'REMOVE_ITEMS' );

		expect( fulfillment.next().value.type ).toBe(
			'DELETE_ENTITY_RECORD_FINISH'
		);

		// Release lock
		expect( fulfillment.next().value.type ).toEqual(
			'MOCKED_RELEASE_LOCK'
		);

		expect( fulfillment.next() ).toMatchObject( {
			done: true,
			value: undefined,
		} );
	} );
} );

describe( 'saveEntityRecord', () => {
	it( 'triggers a POST request for a new record', async () => {
		const post = { title: 'new post' };
		const entities = [
			{ name: 'post', kind: 'postType', baseURL: '/wp/v2/posts' },
		];
		const fulfillment = saveEntityRecord( 'postType', 'post', post );
		// Trigger generator
		fulfillment.next();

		// Provide entities and acquire lock
		expect( fulfillment.next( entities ).value.type ).toBe(
			'MOCKED_ACQUIRE_LOCK'
		);

		// Trigger apiFetch
		expect( fulfillment.next().value.type ).toEqual(
			'SAVE_ENTITY_RECORD_START'
		);

		expect( fulfillment.next().value.type ).toBe( '@@data/SELECT' );
		const { value: apiFetchAction } = fulfillment.next( {} );
		expect( apiFetchAction.request ).toEqual( {
			path: '/wp/v2/posts',
			method: 'POST',
			data: post,
		} );
		// Provide response and trigger action
		const updatedRecord = { ...post, id: 10 };
		const { value: received } = fulfillment.next( updatedRecord );
		expect( received ).toEqual(
			receiveEntityRecords(
				'postType',
				'post',
				updatedRecord,
				undefined,
				true,
				{ title: 'new post' }
			)
		);
		expect( fulfillment.next().value.type ).toBe(
			'SAVE_ENTITY_RECORD_FINISH'
		);
		// Release lock
		expect( fulfillment.next().value.type ).toEqual(
			'MOCKED_RELEASE_LOCK'
		);

		expect( fulfillment.next().value ).toBe( updatedRecord );
	} );

	it( 'triggers a PUT request for an existing record', async () => {
		const post = { id: 10, title: 'new post' };
		const entities = [
			{ name: 'post', kind: 'postType', baseURL: '/wp/v2/posts' },
		];
		const fulfillment = saveEntityRecord( 'postType', 'post', post );
		// Trigger generator
		fulfillment.next();

		// Provide entities and acquire lock
		expect( fulfillment.next( entities ).value.type ).toBe(
			'MOCKED_ACQUIRE_LOCK'
		);

		// Trigger apiFetch
		expect( fulfillment.next().value.type ).toEqual(
			'SAVE_ENTITY_RECORD_START'
		);
		expect( fulfillment.next().value.type ).toBe( '@@data/SELECT' );
		const { value: apiFetchAction } = fulfillment.next( {} );
		expect( apiFetchAction.request ).toEqual( {
			path: '/wp/v2/posts/10',
			method: 'PUT',
			data: post,
		} );
		// Provide response and trigger action
		const { value: received } = fulfillment.next( post );
		expect( received ).toEqual(
			receiveEntityRecords( 'postType', 'post', post, undefined, true, {
				title: 'new post',
				id: 10,
			} )
		);
		expect( fulfillment.next().value.type ).toBe(
			'SAVE_ENTITY_RECORD_FINISH'
		);
		// Release lock
		expect( fulfillment.next().value.type ).toEqual(
			'MOCKED_RELEASE_LOCK'
		);
	} );

	it( 'triggers a PUT request for an existing record with a custom key', async () => {
		const postType = { slug: 'page', title: 'Pages' };
		const entities = [
			{
				name: 'postType',
				kind: 'root',
				baseURL: '/wp/v2/types',
				key: 'slug',
			},
		];
		const fulfillment = saveEntityRecord( 'root', 'postType', postType );
		// Trigger generator
		fulfillment.next();

		// Provide entities and acquire lock
		expect( fulfillment.next( entities ).value.type ).toBe(
			'MOCKED_ACQUIRE_LOCK'
		);

		// Trigger apiFetch
		expect( fulfillment.next().value.type ).toEqual(
			'SAVE_ENTITY_RECORD_START'
		);
		expect( fulfillment.next().value.type ).toBe( '@@data/SELECT' );
		const { value: apiFetchAction } = fulfillment.next( {} );
		expect( apiFetchAction.request ).toEqual( {
			path: '/wp/v2/types/page',
			method: 'PUT',
			data: postType,
		} );
		// Provide response and trigger action
		const { value: received } = fulfillment.next( postType );
		expect( received ).toEqual(
			receiveEntityRecords(
				'root',
				'postType',
				postType,
				undefined,
				true,
				{ slug: 'page', title: 'Pages' }
			)
		);
		expect( fulfillment.next().value.type ).toBe(
			'SAVE_ENTITY_RECORD_FINISH'
		);
		// Release lock
		expect( fulfillment.next().value.type ).toEqual(
			'MOCKED_RELEASE_LOCK'
		);
	} );
} );

describe( 'receiveUserPermission', () => {
	it( 'builds an action object', () => {
		expect( receiveUserPermission( 'create/media', true ) ).toEqual( {
			type: 'RECEIVE_USER_PERMISSION',
			key: 'create/media',
			isAllowed: true,
		} );
	} );
} );

describe( 'receiveAutosaves', () => {
	it( 'builds an action object', () => {
		const postId = 1;
		const autosaves = [
			{
				content: 'test 1',
			},
			{
				content: 'test 2',
			},
		];

		expect( receiveAutosaves( postId, autosaves ) ).toEqual( {
			type: 'RECEIVE_AUTOSAVES',
			postId,
			autosaves,
		} );
	} );

	it( 'converts singular autosaves into an array', () => {
		const postId = 1;
		const autosave = {
			content: 'test 1',
		};

		expect( receiveAutosaves( postId, autosave ) ).toEqual( {
			type: 'RECEIVE_AUTOSAVES',
			postId,
			autosaves: [ autosave ],
		} );
	} );
} );

describe( 'receiveCurrentUser', () => {
	it( 'builds an action object', () => {
		const currentUser = { id: 1 };
		expect( receiveCurrentUser( currentUser ) ).toEqual( {
			type: 'RECEIVE_CURRENT_USER',
			currentUser,
		} );
	} );
} );
