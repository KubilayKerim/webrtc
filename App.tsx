import React, {useEffect, useRef} from 'react';

import {
  Alert,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';
import {useState} from 'react';

import firestore from '@react-native-firebase/firestore';

import randomcolor from 'randomcolor';
import PollModal from './src/Components/PollModal';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from './src/Store/store';
import {setPollDataStore, setVote} from './src/Store/Slices/pollSlice';
import {setStoreUserID} from './src/Store/Slices/userIdSlice';
import uuid from 'react-native-uuid';

const App = () => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [webcamStarted, setWebcamStarted] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [channelId, setChannelId] = useState(null);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [castedVote, setCastedVote] = useState(false);

  const poll = useSelector((state: RootState) => state.poll);
  const userId = useSelector((state: RootState) => state.userId);

  const dispatch = useDispatch();

  const pc = useRef();
  const servers = {
    iceServers: [
      {
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  const startWebcam = async () => {
    pc.current = new RTCPeerConnection(servers);
    const local = await mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    local.getTracks().forEach(track => {
      pc.current.addTrack(track, local);
    });
    setLocalStream(local);
    const remote = new MediaStream();
    setRemoteStream(remote);

    // Push tracks from local stream to peer connection
    local.getTracks().forEach(track => {
      const sender = pc.current
        .getSenders()
        .find(sender => sender.track && sender.track.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track);
      } else {
        pc.current.addTrack(track, local);
      }
    });

    // Pull tracks from remote stream, add to video stream
    pc.current.ontrack = event => {
      setRemoteStream(event.streams[0]);

      event.streams[0].getTracks().forEach(track => {
        remote.addTrack(track);
      });
    };

    setWebcamStarted(true);
  };

  const startCall = async () => {
    const channelDoc = firestore().collection('channels').doc();
    const offerCandidates = channelDoc.collection('offerCandidates');
    const answerCandidates = channelDoc.collection('answerCandidates');

    setChannelId(channelDoc.id);

    pc.current.onicecandidate = async event => {
      if (event.candidate) {
        await offerCandidates.add(event.candidate.toJSON());
      }
    };

    //create offer
    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await channelDoc.set({offer});

    // Listen for remote answer
    channelDoc.onSnapshot(snapshot => {
      const data = snapshot.data();
      if (!pc.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.current.setRemoteDescription(answerDescription);
      }
    });

    // When answered, add candidate to peer connection
    answerCandidates.onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          pc.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  const joinCall = async () => {
    const channelDoc = firestore().collection('channels').doc(channelId);
    const offerCandidates = channelDoc.collection('offerCandidates');
    const answerCandidates = channelDoc.collection('answerCandidates');

    pc.current.onicecandidate = async event => {
      if (event.candidate) {
        await answerCandidates.add(event.candidate.toJSON());
      }
    };

    const channelDocument = await channelDoc.get();
    const channelData = channelDocument.data();

    const offerDescription = channelData.offer;

    await pc.current.setRemoteDescription(
      new RTCSessionDescription(offerDescription),
    );

    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await channelDoc.update({answer});

    offerCandidates.onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          pc.current.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  const createDataChannel = () => {
    setCastedVote(false);

    if (pc.current.textDataChannel) {
      return;
    }
    const dataChannel = pc.current.createDataChannel('text', {
      id: 1,
      ordered: true,
      protocol: 'json',
      negotiated: true,
    });

    dataChannel.onerror = function (error) {
      console.log('dataChannel.onerror', error);
    };

    dataChannel.onmessage = function (event) {
      console.log('dataChannel.onmessage:', event.data);

      if (JSON.stringify(event.data) != JSON.stringify(poll)) {
        console.log(poll.options.length, 'poll.options.length');

        if (poll.options.length == 0) {
          console.log('ilk if e girdi');

          dispatch(setPollDataStore(JSON.parse(event.data)));
        } else {
          console.log('else te');

          const mergedVotes = {};

          // Iterate over options in user1Votes
          JSON.parse(event.data).options.forEach(user1Option => {
            const {id, voters, votes} = user1Option;
            mergedVotes[id] = {
              ...user1Option,
              voters: [...voters],
              votes,
            };
          });

          // Iterate over options in user2Votes
          poll.options.forEach(user2Option => {
            const {id, voters, votes} = user2Option;
            if (mergedVotes[id]) {
              // Option already exists in mergedVotes, update voters and votes
              mergedVotes[id].voters.push(
                ...voters.filter(
                  voter => !mergedVotes[id].voters.includes(voter),
                ),
              );
              mergedVotes[id].votes += votes;
            } else {
              // Option doesn't exist in mergedVotes, add it
              mergedVotes[id] = {
                ...user2Option,
                voters: [...voters],
                votes,
              };
            }
          });

          // Convert mergedVotes object back to an array
          const mergedOptions = Object.values(mergedVotes);

          console.log({mergedOptions});

          // const mergedPoll = {};

          // event.data.options.map(() => {});

          // dispatch(setPollDataStore(event.data));
        }
      }
    };

    dataChannel.onopen = function () {
      console.log('dataChannel.onopen');
    };

    dataChannel.onclose = function () {
      console.log('dataChannel.onclose');
    };

    pc.current.textDataChannel = dataChannel;
  };

  const sendmessage = () => {
    console.log({poll});

    setPollModalVisible(true);
  };

  const handlePollModal = () => {
    setPollModalVisible(!pollModalVisible);

    handleSend();
  };

  const handleSend = async () => {
    await setTimeout(function () {
      console.log('handleSend');

      pc.current.textDataChannel.send(JSON.stringify(poll));
    }, 100);
  };

  useEffect(() => {
    if (userId == null) {
      dispatch(setStoreUserID(uuid.v4()));
    }
  }, []);

  useEffect(() => {
    if (remoteStream?.active) {
      createDataChannel();
    }
  }, [remoteStream]);

  useEffect(() => {
    console.log({poll});
    // handleSend();
  }, [poll]);

  const Option = ({item}) => {
    let color = randomcolor();
    return (
      <View style={[styles.option]}>
        <View style={[styles.option, {backgroundColor: color}]}>
          <Text>{item.optionName} </Text>
        </View>

        <Text>Vote </Text>
        <Text>{item.votes} </Text>
        <TouchableOpacity
          style={{
            backgroundColor: color,
            borderRadius: 10,
            height: 50,
            width: 100,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => {
            // if (item.voters.includes(userId)) {
            //   Alert.alert('you alredy voted for this option');
            // } else if (castedVote) {
            //   Alert.alert('you alredy voted');
            // } else {
            setCastedVote(true);
            dispatch(setVote({optionId: item.id, voterId: userId}));
            handleSend();
            // }
          }}>
          <Text>Vote!</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        {localStream && (
          <RTCView
            streamURL={localStream?.toURL()}
            style={styles.stream}
            objectFit="cover"
            mirror
            zOrder={2}
          />
        )}

        {remoteStream && (
          <RTCView
            streamURL={remoteStream?.toURL()}
            style={styles.remoteStream}
            objectFit="cover"
            mirror
          />
        )}
        {webcamStarted && poll.options.length > 0 && (
          <View style={styles.poll}>
            <Text>Poll</Text>
            <Text>{poll.question}</Text>
            {Object.keys(poll).length !== 0 &&
              poll.options.map(item => {
                return <Option item={item} />;
              })}
          </View>
        )}
        {!webcamStarted && (
          <Button title="Start webcam" onPress={startWebcam} />
        )}
      </View>

      <View style={styles.buttons}>
        {webcamStarted && <Button title="Start call" onPress={startCall} />}
        {webcamStarted && (
          <View style={{flexDirection: 'row'}}>
            <Button title="Start Poll" onPress={() => sendmessage()} />

            <Button title="Join call" onPress={joinCall} />
            <TextInput
              value={channelId}
              placeholder="callId"
              minLength={45}
              style={{borderWidth: 1, padding: 5, width: '50%'}}
              onChangeText={newText => setChannelId(newText)}
            />
          </View>
        )}
      </View>
      {pollModalVisible && (
        <PollModal
          isVisible={pollModalVisible}
          handlePollModal={handlePollModal}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  body: {
    backgroundColor: '#fff',

    justifyContent: 'center',
    alignItems: 'center',
    ...StyleSheet.absoluteFill,
  },
  stream: {
    position: 'absolute',
    top: '3%',
    right: '3%',
    height: '20%',
    width: '20%',
  },

  remoteStream: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  buttons: {
    // alignItems: 'flex-start',
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
  },
  poll: {
    position: 'absolute',
    bottom: '3%',
    left: '3%',
    // height: undefined,
    // width: '50%',
    backgroundColor: '#FFFFFF80',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default App;
