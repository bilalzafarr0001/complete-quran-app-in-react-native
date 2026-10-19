import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NoorApp } from './src/noor/NoorApp';

function App() {
  return (
    <SafeAreaProvider>
      <NoorApp />
    </SafeAreaProvider>
  );
}

export default App;
