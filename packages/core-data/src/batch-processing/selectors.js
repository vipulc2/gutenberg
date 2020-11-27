export const getBatch = ( state, batchId ) => {
	return state.batches[ batchId ];
};

export const getProcessor = ( state, queue ) => {
	return state.processors[ queue ].callback;
};

export const getBatchSizeCallback = ( state, queue ) => {
	return state.processors[ queue ].batchSizeCallback;
};

export const getPromise = ( state, queue, context = 'default' ) => {
	return state.promises[ queue ]?.[ context ];
};

export const getPromises = ( state, queue ) => {
	return Object.values( state.promises[ queue ] || {} ).map(
		( { promise } ) => promise
	);
};