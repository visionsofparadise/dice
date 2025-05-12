export interface Sequenced {
	sequenceNumber: number;
	generation: number;
}

export const isSequencedAfter = (sequencedA: Sequenced, sequencedB: Sequenced): boolean => {
	if (sequencedA.generation > sequencedB.generation) return true;
	if (sequencedA.generation < sequencedB.generation) return false;

	if (sequencedA.sequenceNumber > sequencedB.sequenceNumber) return true;

	return false;
};
