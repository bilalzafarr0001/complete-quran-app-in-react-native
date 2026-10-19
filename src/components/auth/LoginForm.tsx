import { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInputInstance,
  View,
} from 'react-native';
import { useEntrance } from '../../hooks/useEntrance';
import { useShake } from '../../hooks/useShake';
import { useColors } from '../../theme';
import { validateEmail } from '../../utils/validation';
import { Checkbox } from '../Checkbox';
import { FormInput } from '../FormInput';
import { PrimaryButton } from '../PrimaryButton';
import { SocialButtons } from '../SocialButtons';

type Props = {
  onSuccess: (name: string) => void;
};

type Errors = { email?: string; password?: string };

export function LoginForm({ onSuccess }: Props) {
  const colors = useColors();
  const enter = useEntrance(5);
  const { shakeStyle, shake } = useShake();
  const passwordRef = useRef<TextInputInstance>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const submit = () => {
    const next: Errors = {
      email: validateEmail(email),
      password: password ? undefined : 'Enter your password',
    };
    setErrors(next);
    if (next.email || next.password) {
      shake();
      return;
    }

    setLoading(true);
    // TODO: replace with a real login request (and use `remember` to persist the session).
    setTimeout(() => {
      setLoading(false);
      onSuccess(email.split('@')[0]);
    }, 1200);
  };

  return (
    <View>
      <Animated.View style={shakeStyle}>
        <Animated.View style={enter(0)}>
          <FormInput
            label="Email address"
            value={email}
            onChangeText={t => {
              setEmail(t);
              setErrors(e => ({ ...e, email: undefined }));
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        </Animated.View>
        <Animated.View style={enter(1)}>
          <FormInput
            ref={passwordRef}
            label="Password"
            secure
            value={password}
            onChangeText={t => {
              setPassword(t);
              setErrors(e => ({ ...e, password: undefined }));
            }}
            error={errors.password}
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.optionsRow, enter(2)]}>
        <Checkbox checked={remember} onChange={setRemember}>
          <Text style={[styles.optionText, { color: colors.muted }]}>
            Remember me
          </Text>
        </Checkbox>
        {/* TODO: navigate to a reset-password flow. */}
        <Pressable hitSlop={8} accessibilityRole="link">
          <Text style={[styles.link, { color: colors.accent }]}>
            Forgot password?
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={enter(3)}>
        <PrimaryButton title="Log In" onPress={submit} loading={loading} />
      </Animated.View>

      <Animated.View style={enter(4)}>
        {/* TODO: wire up Google / Apple sign-in SDKs. */}
        <SocialButtons onPress={() => {}} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 20,
  },
  optionText: { fontSize: 14, fontWeight: '500' },
  link: { fontSize: 14, fontWeight: '700' },
});
