import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation files
const resources = {
  en: {
    translation: {
      "Factory Overview": "Factory Overview",
      "Real-time production and machine telemetry": "Real-time production and machine telemetry",
      "IoT Stream Live": "IoT Stream Live",
      "IoT Disconnected": "IoT Disconnected",
      "Active Machines": "Active Machines",
      "Production Completed": "Production Completed",
      "Availability": "Availability",
      "Performance": "Performance",
      "Quality": "Quality",
      "Overall Equipment Effectiveness": "Overall Equipment Effectiveness (OEE)",
      "Production Output Today": "Production Output Today",
      "PyTorch AI Engine Status": "PyTorch AI Engine Status",
      "Model Trained": "Model Trained",
      "Architecture": "Architecture",
      "Optimization": "Optimization",
      "Training Loss Curve": "Training Loss Curve",
      "Validation Accuracy (%)": "Validation Accuracy (%)",
      "3D Factory Floor": "3D Factory Floor",
      "Live Digital Twin": "Live Digital Twin"
    }
  },
  ja: {
    translation: {
      "Factory Overview": "工場概要",
      "Real-time production and machine telemetry": "リアルタイム生産・機械テレメトリ",
      "IoT Stream Live": "IoTストリーム接続中",
      "IoT Disconnected": "IoT切断",
      "Active Machines": "稼働中の機械",
      "Production Completed": "生産完了数",
      "Availability": "稼働率",
      "Performance": "性能稼働率",
      "Quality": "良品率",
      "Overall Equipment Effectiveness": "総合設備効率 (OEE)",
      "Production Output Today": "本日の生産量",
      "PyTorch AI Engine Status": "PyTorch AIエンジンステータス",
      "Model Trained": "学習完了",
      "Architecture": "アーキテクチャ",
      "Optimization": "最適化",
      "Training Loss Curve": "学習損失曲線",
      "Validation Accuracy (%)": "検証精度 (%)",
      "3D Factory Floor": "3D工場フロア",
      "Live Digital Twin": "ライブデジタルツイン"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
