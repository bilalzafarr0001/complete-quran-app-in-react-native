import { useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInputInstance,
  View,
} from 'react-native';
import { useEntrance } from '../../hooks/useEntrance';
import { useShake } from '../../hooks/useShake';
import { useColors } from '../../theme';
import { validateEmail, validatePassword } from '../../utils/validation';
import { Checkbox } from '../Checkbox';
import { FormInput } from '../FormInput';
import { PasswordStrength } from '../PasswordStrength';
import { PrimaryButton } from '../PrimaryButton';

type Props = {
  onSuccess: (name: string) => void;
};

type Field = 'name' | 'email' | 'password' | 'confirm';
type Errors = Partial<Record<Field | 'terms', string>>;

export function SignUpForm({ onSuccess }: Props) {
  const colors = useColors();
  const enter = useEntrance(6);
  const { shakeStyle, shake } = useShake();
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const update = (field: Field) => (text: string) => {
    setValues(v => ({ ...v, [field]: text }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const submit = () => {
    const next: Errors = {
      name: values.name.trim() ? undefined : 'Enter your name',
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirm:
        values.confirm && values.confirm === values.password
          ? undefined
          : 'Passwords do not match',
      terms: agreed ? undefined : 'Please accept the terms to continue',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      shake();
      return;
    }

    setLoading(true);
    // TODO: replace with a real sign-up request to your backend.
    setTimeout(() => {
      setLoading(false);
      onSuccess(values.name.trim().split(' ')[0]);
    }, 1400);
  };

  return (
    <View>
      <Animated.View style={shakeStyle}>
        <Animated.View style={enter(0)}>
          <FormInput
            label="Full name"
            value={values.name}
            onChangeText={update('name')}
            error={errors.name}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
        </Animated.View>
        <Animated.View style={enter(1)}>
          <FormInput
            ref={emailRef}
            label="Email address"
            value={values.email}
            onChangeText={update('email')}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        </Animated.View>
        <Animated.View style={enter(2)}>
          <FormInput
            ref={passwordRef}
            label="Password"
            secure
            value={values.password}
            onChangeText={update('password')}
            error={errors.password}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <PasswordStrength password={values.password} />
        </Animated.View>
        <Animated.View style={enter(3)}>
          <FormInput
            ref={confirmRef}
            label="Confirm password"
            secure
            value={values.confirm}
            onChangeText={update('confirm')}
            error={errors.confirm}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
          />
        </Animated.View>
        <Animated.View style={[styles.terms, enter(4)]}>
          <Checkbox
            checked={agreed}
            error={!!errors.terms}
            onChange={v => {
              setAgreed(v);
              setErrors(e => ({ ...e, terms: undefined }));
            }}
          >
            <Text style={[styles.termsText, { color: colors.muted }]}>
              I agree to the{' '}
              <Text style={[styles.termsLink, { color: colors.accent }]}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={[styles.termsLink, { color: colors.accent }]}>
                Privacy Policy
              </Text>
            </Text>
          </Checkbox>
          {errors.terms ? (
            <Text style={[styles.termsError, { color: colors.error }]}>
              {errors.terms}
            </Text>
          ) : null}
        </Animated.View>
      </Animated.View>

      <Animated.View style={enter(5)}>
        <PrimaryButton
          title="Create Account"
          onPress={submit}
          loading={loading}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  terms: { marginTop: 4, marginBottom: 20 },
  termsText: { fontSize: 13, lineHeight: 19 },
  termsLink: { fontWeight: '700' },
  termsError: { fontSize: 12, marginTop: 6, marginLeft: 32 },
});
