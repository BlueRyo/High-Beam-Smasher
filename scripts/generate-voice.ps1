# Rebuild the bundled reactions using a generic Windows system voice.
# The WAVs ship with the game; players do not need Windows speech synthesis.
Add-Type -AssemblyName System.Speech
$ErrorActionPreference = 'Stop'
$audioRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/audio'))
New-Item -ItemType Directory -Path $audioRoot -Force | Out-Null
$synthesizer = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
    $synthesizer.SelectVoice('Microsoft David Desktop')
    $synthesizer.Rate = 1
    $synthesizer.Volume = 100
    foreach ($reaction in @(
        @{ Name = 'high-beam'; Text = 'Motherfucker!' },
        @{ Name = 'sorry'; Text = 'Sorry.' }
    )) {
        $synthesizer.SetOutputToWaveFile((Join-Path $audioRoot ($reaction.Name + '.wav')))
        if ($reaction.Name -eq 'high-beam') {
            $synthesizer.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><prosody rate="+12%" pitch="-8%" volume="x-loud"><emphasis level="strong">Mother</emphasis><break time="65ms"/><emphasis level="strong">fucker!</emphasis></prosody></speak>')
        } else {
            $synthesizer.Speak($reaction.Text)
        }
        $synthesizer.SetOutputToNull()
    }
} finally {
    $synthesizer.Dispose()
}
