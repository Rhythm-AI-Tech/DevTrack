const selectProblems = (state) => state.coding.problems;
const selectStatus = (state) => state.coding.status;
const selectError = (state) => state.coding.error;
 
export {selectProblems, selectStatus, selectError};