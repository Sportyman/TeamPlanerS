import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { PollEvent } from '../../types/whatsapp';
import { handleFirestoreError, OperationType } from './firestoreError';
import { addLog } from '../syncService';

export const deleteWhatsAppPoll = async (
  poll: Pick<PollEvent, 'id' | 'pollId' | 'question'>
): Promise<void> => {
  const path = `polls_events/${poll.id}`;
  try {
    await deleteDoc(doc(db, 'polls_events', poll.id));

    if (poll.pollId) {
      const duplicatePollsSnap = await getDocs(
        query(collection(db, 'polls_events'), where('pollId', '==', poll.pollId))
      );
      for (const d of duplicatePollsSnap.docs) {
        if (d.id !== poll.id) {
          await deleteDoc(doc(db, 'polls_events', d.id));
        }
      }

      const votesSnap = await getDocs(
        query(collection(db, 'poll_votes'), where('pollId', '==', poll.pollId))
      );
      for (let i = 0; i < votesSnap.docs.length; i += 400) {
        const batch = writeBatch(db);
        votesSnap.docs.slice(i, i + 400).forEach((voteDoc) => batch.delete(voteDoc.ref));
        await batch.commit();
      }
    }

    addLog(`Permanently deleted poll ${poll.pollId || poll.id} (${poll.question}) from Firebase`, 'SYNC');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const deleteWhatsAppPollsBatch = async (polls: PollEvent[]): Promise<number> => {
  let deleted = 0;
  for (const poll of polls) {
    await deleteWhatsAppPoll(poll);
    deleted++;
  }
  return deleted;
};
