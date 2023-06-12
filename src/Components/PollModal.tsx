import ReactNativeModal from 'react-native-modal';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useEffect, useState} from 'react';
import Color from '../Constants/Color';
import {useDispatch} from 'react-redux';
import {setPollDataStore} from '../Store/Slices/pollSlice';

const PollModal = ({isVisible, handlePollModal}) => {
  const dispatch = useDispatch();
  const [optionCount, setOptionCount] = useState(1);
  const [question, setQuestion] = useState('');
  const [pollData, setPollData] = useState({
    question: question,
    options: [],
  });

  useEffect(() => {
    setPollData(prevState => ({
      ...prevState,
      question: question,
    }));
  }, [question]);

  const OptionAdder = () => {
    const [option, setOption] = useState('');

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <Text>Option {optionCount}</Text>
        <TextInput
          style={styles.textInput}
          value={option}
          onChangeText={setOption}></TextInput>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            const updatedOptions = [
              ...pollData.options,
              {optionName: option, id: optionCount, votes: 0, voters: []},
            ];

            setOptionCount(optionCount + 1);
            setPollData(prevState => ({
              ...prevState,
              options: updatedOptions,
            }));
          }}>
          <Text style={{color: Color.white}}>Add</Text>
        </TouchableOpacity>
      </View>
    );
  };
  return (
    <ReactNativeModal
      isVisible={isVisible}
      onBackdropPress={() => {
        handlePollModal();
      }}>
      <View style={styles.pollContainer}>
        <Text style={{marginBottom: 20, alignSelf: 'center'}}>Create poll</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
          }}>
          <Text>Question</Text>
          <TextInput
            style={styles.textInput}
            value={question}
            onChangeText={setQuestion}></TextInput>
        </View>

        <OptionAdder />

        <Text>{JSON.stringify(pollData)}</Text>
        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => {
            dispatch(setPollDataStore(pollData));

            handlePollModal();
          }}>
          <Text style={{color: Color.white}}>Send</Text>
        </TouchableOpacity>
      </View>
    </ReactNativeModal>
  );
};

const styles = StyleSheet.create({
  pollContainer: {
    backgroundColor: Color.white,
    borderRadius: 15,
    justifyContent: 'center',
    // alignItems: 'center',
    padding: 30,
  },
  textInput: {
    backgroundColor: Color.TextInputColor,
    width: '60%',
    marginHorizontal: 10,
    borderRadius: 15,
  },
  addButton: {
    backgroundColor: Color.blue,
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  sendButton: {
    backgroundColor: Color.blue,
    height: 50,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    alignSelf: 'center',
    marginVertical: 20,
  },
});

export default PollModal;
