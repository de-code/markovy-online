import React from 'react';
import { createSelector } from 'reselect';
import markovClientFactory from '../../markov';
import debounce from 'debounce';

import {
  Card,
  CardActions,
  CardHeader,
  CardText,
  FlatButton,
  FileInput,
  FontAwesomeIcon,
  Link,
  LoadingIndicator,
  Slider,
  Text,
  Toggle,
  View
} from '../../components';

import { range } from '../../utils';

const KEY_NAME = 'mrkvy_file';
const KEY_DATA = 'mrkvy_data';
const KEY_SETTINGS = 'mrkvy_settings';

const styles = {
  card: {
    marginBottom: 20
  },
  cardHeader: {
    backgroundColor: '#eee',
    fontWeight: 'bold'
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
  },
  info: {
    marginTop: 10
  },
  stats: {
    container: {
    },
    label: {
      display: 'inline-block',
      minWidth: 100,
      fontWeight: 'bold'
    },
    value: {
      display: 'inline-block',
      textAlign: 'right',
      minWidth: 100
    }
  },
  paragraph: {
    marginBottom: 10
  },
  link: {
    textDecoration: 'none',
    cursor: 'hand'
  }
}

const LabelledSlider = ({ label, ...otherProps }) => (
  <View style={ styles.slider.container }>
    <Text style={ styles.slider.label }>{ label }</Text>
    <Slider style={ styles.slider.slider } { ...otherProps }/>
  </View>
);

const LabelledStats = ({ label, value }) => (
  <View style={ styles.stats.container }>
    <Text style={ styles.stats.label }>{ `${label}: ` }</Text>
    <Text style={ styles.stats.value }>{ value }</Text>
  </View>
);

class Main extends React.Component {
  constructor(props) {
    super(props);
    let file = this.restoreFile();
    const settings = this.restoreSettings();
    this.state = {
      file,
      markovOptions: (settings && settings.markovOptions) || {
        stateSize: 3,
        minWords: 10,
        maxWords: 0,
      },
      sentenceCount: (settings && settings.sentenceCount) || 10,
      reqId: 0
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
        charCount: data.length,
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
        const markov = markovClientFactory(parsedData.lines, markovOptions);
        markov.buildCorpus();
        return markov;
      }
    );
    this.getGeneratedSentences = createSelector(
      this.getMarkov,
      () => this.state.sentenceCount,
      () => this.state.reqId,
      (markov, sentenceCount, reqId) => {
        if (!markov) {
          return Promise.resolve([]);
        }
        return markov.generateSentences(sentenceCount);
      }
    );
    this.updateGenerationDebounced = debounce(() => {
      this.saveSettings({
        sentenceCount: this.state.sentenceCount,
        markovOptions: this.state.markovOptions
      });
      this.getGeneratedSentences().then(generateSentences => {
        console.log("generateSentences:", generateSentences);
        this.setState({
          generateSentences,
          loading: false
        });
      });
    }, 200);
    this.updateGeneration = () => {
      this.setState({
        loading: true
      });
      this.updateGenerationDebounced();
    };
    this.refresh = () => {
      this.setState({
        reqId: this.state.reqId + 1
      });
      this.updateGeneration();
    }
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

  restoreSettings() {
    try {
      const settings = localStorage.getItem(KEY_SETTINGS);
      if (settings) {
        return JSON.parse(settings);
      }
    } catch(e) {
      console.error("failed to load settings:", e);
    }
  }

  saveSettings(settings) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
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
    const { charCount, lines, minWordsPerLine, maxWordsPerLine } = this.getParsedData();
    const { markovOptions, sentenceCount, generateSentences, loading } = this.state;
    const { minWords, stateSize } = markovOptions;
    return (
      <View>
        <Card style={ styles.card } initiallyExpanded={ true }>
          <CardHeader
            style={ styles.cardHeader }
            title="Text Generator"
            actAsExpander={ true }
            showExpandableButton={ true }
          />
          <CardText style={ styles.controlPanel } expandable={ true }>
            <View style={ styles.step }>
              <FileInput
                file={ this.state.file }
                onLoad={ this.onLoad }
              />
              <View style={ styles.info }>
                <LabelledStats label="Chars" value={ charCount }/>
                <LabelledStats label="Lines" value={ lines && lines.length }/>
                <LabelledStats label="Min Words" value={ minWordsPerLine }/>
                <LabelledStats label="Max Words" value={ maxWordsPerLine }/>
              </View>
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
          </CardText>
        </Card>
        <Card style={ styles.card } initiallyExpanded={ true }>
          <CardHeader
            style={ styles.cardHeader }
            title="Results"
            actAsExpander={ true }
            showExpandableButton={ true }
          />
          <CardActions>
            <FlatButton
              label="Refresh"
              onClick={ this.refresh }
              disabled={ loading || !generateSentences || !generateSentences.length }
            />
          </CardActions>
          <CardText expandable={ true }>
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
          </CardText>
        </Card>
        <Card style={ styles.card } initiallyExpanded={ true }>
          <CardHeader
            style={ styles.cardHeader }
            title="Info"
            actAsExpander={ true }
            showExpandableButton={ true }
          />
          <CardText expandable={ true }>
            <View style={ styles.paragraph }>
              <Text>The selected file will be processed within the browser and won't be submitted
                to the internet.
              </Text>
            </View>
            <View style={ styles.paragraph }>
              <Text>If a JSON file is selected, all of the string values but not keys, at any depth,
                will be treated as lines. Or multiple lines if those strings contain line feeds.
                Any other data is ignored.
              </Text>
            </View>
            <View style={ styles.paragraph }>
              <Link style={ styles.link } href="https://github.com/de-code/markovy-online">
                <FontAwesomeIcon name="github"/>
                <Text>{ ' ' }</Text>
                <Text>GitHub</Text>
              </Link>
            </View>
          </CardText>
        </Card>
      </View>
    );
  }
}

export default Main;
