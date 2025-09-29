import { setLogLevel, setLogFormat } from '../utils/logger';

// Silence les logs pendant les tests pour éviter le bruit dans la sortie Jest.
setLogLevel('error');
setLogFormat('pretty');
