import React from 'react';
import { createSelector } from 'reselect';
import Markov from 'markov-strings';
import debounce from 'debounce';

import {
  Card,
  FileInput,
  LoadingIndicator,
  Slider,
  Text,
  Toggle,
  View
} from '../../components';

import { range } from '../../utils';

const KEY_NAME = 'mrkvy_file';
const KEY_DATA = 'mrkvy_data';

const styles = {
  card: {
    padding: 10,
    marginBottom: 20
  },
  controlPanel: {
    display: 'flex'
  },
  step: {
    maxWidth: 400,
    display: 'inline-block',
    marginRight: 10
  },
  field: {
    marginBottom: 10
  },
  slider: {
    container: {
      marginTop: 30
    },
    label: {
    },
    slider: {
    }
  }
}

const LabelledSlider = ({ label, ...otherProps }) => (
  <View style={ styles.slider.container }>
    <Text style={ styles.slider.label }>{ label }</Text>
    <Slider style={ styles.slider.slider } { ...otherProps }/>
  </View>
);

class Main extends React.Component {
  constructor(props) {
    super(props);
    let file = this.restoreFile();
    this.state = {
      file,
      markovOptions: {
        stateSize: 3,
        minWords: 10,
        maxWords: 0,
      },
      sentenceCount: 10,
    };
    this.onLoad = file => {
      console.log("onload:", file && file.name);
      this.setState({ file });
      this.saveFile(file);
      this.updateGeneration();
    }
    this.getData = () => this.state.file && this.state.file.data;
    this.getParsedData = createSelector(this.getData, data => {
      if (!data) {
        return {};
      }
      const lines = data.split('\n');
      console.log("lines:", lines.length);
      console.log("lines[0]:", lines[0]);
      const wordsPerLine = lines.map(line => line.split(' ').length);
      const minWordsPerLine = Math.min(...wordsPerLine);
      const maxWordsPerLine = Math.max(...wordsPerLine);
      return {
        lines,
        minWordsPerLine,
        maxWordsPerLine
      };
    });
    this.getMarkov = createSelector(
      this.getParsedData,
      () => this.state.markovOptions,
      (parsedData, markovOptions) => {
        if (!parsedData.lines) {
          return;
        }
        const markov = new Markov(parsedData.lines, markovOptions);
        markov.buildCorpusSync();
        return markov;
      }
    );
    this.getGeneratedSentences = createSelector(
      this.getMarkov,
      () => this.state.sentenceCount,
      (markov, sentenceCount) => {
        if (!markov) {
          return [];
        }
        return range(sentenceCount).map(() => markov.generateSentenceSync().string);
      }
    );
    this.updateGenerationDebounced = debounce(() => {
      const generateSentences = this.getGeneratedSentences();
      this.setState({
        generateSentences,
        loading: false
      });
    }, 200);
    this.updateGeneration = () => {
      this.setState({
        loading: true
      });
      this.updateGenerationDebounced();
    };
  }

  componentDidMount() {
    this.updateGeneration();
  }

  restoreFile() {
    const name = localStorage.getItem(KEY_NAME);
    const data = localStorage.getItem(KEY_DATA);
    if (name && data) {
      return {
        name,
        data 
      };
    }
  }

  saveFile(file) {
    if (file) {
      localStorage.setItem(KEY_NAME, file.name);
      localStorage.setItem(KEY_DATA, file.data);
    } else {
      localStorage.removeItem(KEY_NAME);
      localStorage.removeItem(KEY_DATA);
    }
  }

  updateMarkovOption(key, value) {
    this.setState(state => ({
      markovOptions: {
        ...state.markovOptions,
        [key]: value
      }
    }));
    this.updateGeneration();
  }

  updateOption(state) {
    this.setState(state);
    this.updateGeneration();
  }

  render() {
    const { minWordsPerLine, maxWordsPerLine } = this.getParsedData();
    const { markovOptions, sentenceCount, generateSentences, loading } = this.state;
    const { minWords, stateSize } = markovOptions;
    return (
      <View>
        <Card style={ styles.card }>
          <View style={ styles.controlPanel }>
            <View style={ styles.step }>
              <FileInput
                file={ this.state.file }
                onLoad={ this.onLoad }
              />
            </View>
            <View style={ styles.step }>
              <View style={ styles.field }>
                <Toggle
                  label="Enable Tri-gram (requires more text)"
                  toggled={ stateSize === 3 }
                  onToggle={ () => this.updateMarkovOption('stateSize', stateSize === 3 ? 2 : 3) }
                  style={ styles.toggle }
                />
              </View>
              <View style={ styles.field }>
                {
                  maxWordsPerLine &&
                  <LabelledSlider
                    label={ `Min words (${minWords}):` }
                    value={ minWords }
                    min={ 0 }
                    max={ maxWordsPerLine || 1 }
                    step={ 1 }
                    onChange={ (event, newValue) => this.updateMarkovOption('minWords', newValue) }
                  />
                }
              </View>
              <View style={ styles.field }>
                {
                  <LabelledSlider
                    label={ `Sentence count (${sentenceCount}):` }
                    value={ sentenceCount }
                    min={ 1 }
                    max={ 100 }
                    step={ 1 }
                    onChange={ (event, newValue) => this.updateOption({ sentenceCount: newValue }) }
                  />
                }
              </View>
            </View>
          </View>
        </Card>
        <Card style={ styles.card }>
          <LoadingIndicator loading={ loading }>
            <View>
              {
                generateSentences && generateSentences.map((sentence, index) => (
                  <View key={ index }>
                    <Text>{ sentence }</Text>
                  </View>
                ))
              }
            </View>
          </LoadingIndicator>
        </Card>
      </View>
    );
  }
}

export default Main;
