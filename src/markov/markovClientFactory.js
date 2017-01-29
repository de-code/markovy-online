import Markov from 'markov-strings';

import { range } from '../utils';

const markovClientFactory = (lines, options) => {
  const markov = new Markov(lines, options);
  let buildCorpusPromise;
  const buildCorpus = () => {
    if (!buildCorpusPromise) {
      buildCorpusPromise = markov.buildCorpus();
    }
    return buildCorpusPromise;
  };

  const getString = x => x && x.string;

  const generateSentence = () => buildCorpus().then(() => markov.generateSentence()).then(getString);

  const generateSentences = count => buildCorpus().then(() =>
    range(count).map(() => markov.generateSentenceSync().string)
  );

  return {
    buildCorpus,
    generateSentence,
    generateSentences
  };
};

export default markovClientFactory;
