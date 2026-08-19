import React from 'react';
import WaterSettingsSection from './WaterSettingsSection';

const WaterSettingsTab = () => {
    // WaterSettingsSection already implements the required functionality properly.
    // We are wrapping it here to maintain consistent naming convention for the tabs.
    return <WaterSettingsSection />;
};

export default WaterSettingsTab;