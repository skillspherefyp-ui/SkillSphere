import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppButton from './ui/AppButton';
import AppInput from './ui/AppInput';
import { useTheme } from '../context/ThemeContext';
import { API_BASE } from '../services/apiClient';

const AddMaterialModal = ({ visible, onClose, onAddMaterial }) => {
  const { theme } = useTheme();
  const [selectedFile, setSelectedFile] = useState(null); // Store the actual file object
  const [fileUri, setFileUri] = useState(''); // File URI for preview
  const [fileName, setFileName] = useState(''); // File name
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSelectFile = () => {
    if (Platform.OS === 'web') {
      // Create a file input element for web
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,image/png,image/jpeg,image/jpg,application/pdf';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
          if (!allowedTypes.includes(file.type)) {
            Alert.alert('Error', 'Please select a PDF or image file only.');
            return;
          }
          setFileName(file.name);
          setSelectedFile(file);
          setFileUri(URL.createObjectURL(file)); // For preview only
        }
      };
      input.click();
    } else {
      // For mobile, show instructions to enter PDF file path
      Alert.alert(
        'Select File',
        'Please enter the file name or path manually. Actual file picker integration requires react-native-document-picker library.'
      );
    }
  };

  const handleAdd = async () => {
    if (!selectedFile && !fileName) {
      Alert.alert('Error', 'Please select a file.');
      return;
    }

    // If on web, upload the file first
    if (Platform.OS === 'web' && selectedFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch(`${API_BASE}/upload/file`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        // Get file type from mimetype
        let fileType = 'pdf';
        if (result.file.mimetype.startsWith('image/')) {
          fileType = 'image';
        }

        const newMaterial = {
          id: Date.now().toString(),
          type: fileType,
          uri: result.file.url, // Server URL instead of blob URL
          fileName: result.file.filename,
          description,
        };

        onAddMaterial(newMaterial);

        // Reset form
        setSelectedFile(null);
        setFileUri('');
        setFileName('');
        setDescription('');
        setUploading(false);
        onClose();

        Alert.alert('Success', 'File uploaded successfully!');
      } catch (error) {
        console.error('Upload error:', error);
        setUploading(false);
        Alert.alert('Error', error.message || 'Failed to upload file');
      }
    } else {
      // For mobile or manual entry
      const newMaterial = {
        id: Date.now().toString(),
        type: 'pdf',
        uri: fileName,
        fileName: fileName,
        description,
      };

      onAddMaterial(newMaterial);
      setFileUri('');
      setFileName('');
      setDescription('');
      onClose();
    }
  };

  const styles = getStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
            Add Material (PDF or Image)
          </Text>

          <AppButton
            title="Select File"
            onPress={handleSelectFile}
            variant="outline"
            fullWidth
            icon={<Icon name="cloud-upload-outline" size={20} color={theme.colors.primary} />}
            iconPosition="left"
            style={styles.selectFileButton}
            disabled={uploading}
          />

          {fileName && (
            <View style={styles.selectedFileContainer}>
              <Icon name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={[styles.selectedFileName, { color: theme.colors.textPrimary }]}>
                {fileName}
              </Text>
            </View>
          )}

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.uploadingText, { color: theme.colors.textSecondary }]}>
                Uploading file...
              </Text>
            </View>
          )}

          <AppInput
            label="File Name / Path (for mobile)"
            value={fileName}
            onChangeText={setFileName}
            placeholder="e.g., introduction.pdf"
            style={styles.input}
            editable={!uploading}
          />

          <AppInput
            label="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of the material"
            multiline
            numberOfLines={2}
            style={styles.input}
            editable={!uploading}
          />

          <View style={styles.buttonContainer}>
            <AppButton
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={styles.halfButton}
              disabled={uploading}
            />
            <AppButton
              title={uploading ? "Uploading..." : "Add Material"}
              onPress={handleAdd}
              variant="primary"
              style={styles.halfButton}
              disabled={uploading}
              loading={uploading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 15,
  },
  selectFileButton: {
    marginBottom: 15,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  selectedFileName: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  uploadingText: {
    marginLeft: 10,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  halfButton: {
    flex: 1,
  },
});

export default AddMaterialModal;