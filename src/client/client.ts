import * as fs from 'fs';
import * as child_process from 'child_process';
import * as electron from 'electron';

type LaunchConfig = {
	gzdoomExecutablePath: string | null;
	iwadPath: string | null
	externalFilePaths: string[];
};

function saveConfigToFile(config: LaunchConfig) {
	fs.writeFile('./gzrun-config.json', JSON.stringify(config), error => {
		// todo: handle errors better
		if (error) {
			throw error;
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	const config: LaunchConfig = {
		gzdoomExecutablePath: null,
		iwadPath: null,
		externalFilePaths: [],
	};

	const containerExec = elemId('container-exec');
	const containerIwad = elemId('container-iwad');

	const launchGameButton = elemId<HTMLButtonElement>('launch-game-button');
	const currentGzdoomElement = elemId('gzdoom-currently-selected');
	const currentIwadElement = elemId('iwad-currently-selected');

	launchGameButton.addEventListener('click', () => {
		spawnGzdoom();
	});

	function updateLaunchButtonState() {
		launchGameButton.disabled = (
				config.gzdoomExecutablePath === null ||
				config.iwadPath === null);
	}

	elemId<HTMLButtonElement>('gzdoom-select-button').addEventListener('click', () => {
		const selectedFile = electron.remote.dialog.showOpenDialog({
			properties: ['openFile'],
			filters: [
				{name: 'All Files', extensions: ['*']}
			]
		});

		if (!selectedFile) {
			// No file selected.
			config.gzdoomExecutablePath = null;
			currentGzdoomElement.textContent = 'NO FILE SELECTED';
			containerExec.classList.add('required-missing');
			updateLaunchButtonState();
			return;
		}

		// File was selected
		config.gzdoomExecutablePath = selectedFile.toString();
		currentGzdoomElement.textContent = config.gzdoomExecutablePath;
		containerExec.classList.remove('required-missing');
		updateLaunchButtonState();
	});

	elemId<HTMLButtonElement>('iwad-select-button').addEventListener('click', () => {
		const selectedFile = electron.remote.dialog.showOpenDialog({
			properties: ['openFile'],
			filters: [
				{name: 'WAD', extensions: ['wad']},
				{name: 'All Files', extensions: ['*']}
			]
		});

		if (!selectedFile) {
			// No files selected.
			config.iwadPath = null;
			currentIwadElement.textContent = 'NO FILE SELECTED';
			containerIwad.classList.add('required-missing');
			updateLaunchButtonState();
			return;
		}

		config.iwadPath = selectedFile.toString();
		currentIwadElement.textContent = config.iwadPath;
		containerIwad.classList.remove('required-missing');
		updateLaunchButtonState();
	});

	elemId<HTMLButtonElement>('externals-select-button').addEventListener('click', () => {
		const selectedFiles = electron.remote.dialog.showOpenDialog({
			properties: ['openFile', /*'openDirectory',*/ 'multiSelections'],
			filters: [
				{name: 'WAD, pk3', extensions: ['wad', 'pk3']},
				{name: 'All Files', extensions: ['*']}
			]
		});

		if (!selectedFiles) {
			// No files selected.
			return;
		}

		const listElement = elemId('externals-current-list');
		for (const filePath of selectedFiles) {
			const lineElement = document.createElement('div');
			lineElement.textContent = filePath;
			listElement.appendChild(lineElement);
		}

		config.externalFilePaths = selectedFiles;
	});

	function spawnGzdoom(): void {
		const commandLineArgs = [
			'-config', '/home/levi/Games/DooMods/engine/gzdoom.ini',
			'-savedir', '/home/levi/Games/DooMods/engine/saves/',
			'-iwad', config.iwadPath,
		];
		for (const filePath of config.externalFilePaths) {
			commandLineArgs.push('-file', filePath);
		}
		const gzdoomProcess = child_process.execFile(config.gzdoomExecutablePath!, <any>commandLineArgs);

		gzdoomProcess.stdout.on('data', data => {
			writeMessageToConsole(data.toString());
		});
	}

	function writeMessageToConsole(message: string): void {
		const consoleElement = elemId('console-log');

		const messageElement = document.createElement('div');
		messageElement.textContent = message;
		consoleElement.appendChild(messageElement);

		if (message.startsWith('Picked up')) {
			messageElement.style.color = '#3193ff';
		} else if (message.startsWith('You got')) {
			messageElement.style.color = '#22cc22';
		} else if (message.startsWith('game saved')) {
			messageElement.style.color = '#ffff00';
		} else if (message.startsWith('Berserk!') || message.startsWith('A chainsaw')) {
			messageElement.style.color = '#ff9700';
		} else if (message.startsWith('map')) {
			messageElement.style.color = '#cd46ff';
			messageElement.style.fontSize = '133%';
		}

		// If the console log is currently scrolled all the way to the bottom (or close to the bottom)
		// then keep it scrolled all the way after appending the new messages.
		if (consoleElement.scrollTop + consoleElement.offsetHeight > consoleElement.scrollHeight - 60) {
			consoleElement.scrollTop = consoleElement.scrollHeight;
		}
	}
});

function elemId<T extends HTMLElement = HTMLElement>(elementId: string): T {
	const type = typeof elementId;
	if (type !== 'string') {
		throw new TypeError(`Element id must be a string, got typeof "${type}" instead.`);
	}
	const element = document.getElementById(elementId);
	if (!element) {
		throw new Error();
	}
	return element as T;
}
