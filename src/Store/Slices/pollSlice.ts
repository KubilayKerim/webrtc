import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface PollState {
  question: string,
  options:{optionName: string, id: number, voters:string[], votes:number}[]
}

const initialState: PollState = {
    question: '',
    options:[]
  }

export const pollSlice = createSlice({
  name: 'poll',
  initialState,
  reducers: {
    setPollDataStore: (state, action) => {
        return action.payload;
    },
    setVote:(state, action) => {
      console.log('setVote');

      console.log('action.payload', action.payload);
      
      
      
      const { optionId, voterId } = action.payload;
      console.log({optionId});

      console.log({voterId});


      const updatedOptions = state.options.map(option => {
        if (option.id === optionId) {
          console.log('girdi');
          if (option.voters) {
            const updatedVoters = [...option.voters, voterId];
            return { ...option, votes: option.votes + 1, voters: updatedVoters };
          }
          else{
            return { ...option, votes: 1, voters: [voterId] };
          }
        }
        return option;
      });
      console.log({ ...state, options: updatedOptions });
      
      return { ...state, options: updatedOptions };
  },
    clearPollData: (state) => {
    state = initialState;
    },
  },
})

// Action creators are generated for each case reducer function
export const { setPollDataStore, setVote, clearPollData } = pollSlice.actions

export default pollSlice.reducer