import GameAudio from './GameAudio';
import App from './App';
import PlayerApp from './PlayerApp';
import {useRoute} from './router';
import {network} from './transport';
import {OperatorGate,DecisionLayer,NetworkFeedback} from './NetworkUI';
export default function Root(){const route=useRoute();return <><GameAudio/>{route.startsWith('/operator')?network?<OperatorGate><div className="server-operated"><App/></div></OperatorGate>:<App/>:<PlayerApp/>}{network&&<><DecisionLayer/><NetworkFeedback/></>}</>;}
