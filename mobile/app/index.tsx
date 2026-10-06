import { Redirect } from 'expo-router';

// Entry route. Once auth exists this will send signed-in users to the tabs instead.
export default function Index() {
  return <Redirect href="/welcome" />;
}
