import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import AppHeader from '../../components/ui/AppHeader';
import AppCard from '../../components/ui/AppCard';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { courseId } = route.params || {};
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  
  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb && width > 1200 ? 1200 : '100%';

  const handlePayment = () => {
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill all payment details',
      });
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Payment Successful',
      text2: 'Your certificate payment has been processed. You will receive your certificate shortly.',
    });
    setTimeout(() => navigation.navigate('Certificates'), 1500);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Payment" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { maxWidth, alignSelf: 'center', width: '100%' }]}
      >
        <AppCard style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>Certificate Payment</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Certificate Fee</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>$29.99</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTotalLabel, { color: theme.colors.textPrimary }]}>Total</Text>
            <Text style={[styles.summaryTotalValue, { color: theme.colors.primary }]}>$29.99</Text>
          </View>
        </AppCard>

        <AppCard style={styles.paymentSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Payment Details</Text>
          <AppInput
            label="Card Number"
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="numeric"
            placeholder="1234 5678 9012 3456"
          />
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <AppInput
                label="Expiry Date"
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="MM/YY"
              />
            </View>
            <View style={styles.halfInput}>
              <AppInput
                label="CVV"
                value={cvv}
                onChangeText={setCvv}
                keyboardType="numeric"
                secureTextEntry
                placeholder="123"
              />
            </View>
          </View>
          <AppInput
            label="Cardholder Name"
            value={cardholderName}
            onChangeText={setCardholderName}
            placeholder="John Doe"
          />
        </AppCard>

        <AppButton
          title="Pay $29.99"
          onPress={handlePayment}
          variant="primary"
          fullWidth
          style={styles.payButton}
          icon={<Icon name="card" size={16} color="#ffffff" />}
          iconPosition="left"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  summaryCard: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  paymentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  payButton: {
    marginTop: 10,
  },
});

export default PaymentScreen;

