import {promises as fsp} from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as gulp from 'gulp';
import chalk from 'chalk';
import * as browserSync from 'browser-sync';
import * as runSequence from 'run-sequence';
import * as del from 'del';

const ROOT_DIR = path.join(__dirname, '../');
const OUTPUT_DIR = path.join(ROOT_DIR, './dist/');

gulp.task('clean', async () => {
	return del([OUTPUT_DIR]);
});

gulp.task('scaffolding', async () => {
	const pkg = Object.assign({}, require('../package.json'));

	delete pkg.devDependencies;
	pkg.main = "main.js";
	pkg.scripts = {
		"start": "electron ./",
	};

	if (!await exists('./dist')) {
		await fsp.mkdir('./dist/');
	}
	await fsp.writeFile('./dist/package.json', JSON.stringify(pkg, null, 2));
});

gulp.task('client@html', () => {
	return gulp.src('src/client/index.html')
			.pipe(gulp.dest('dist/client/'));
});
gulp.task('client@html:watch', ['client@html'], () => {
	gulp.watch('src/client/index.html', ['client@html']);
});

gulp.task('client@css', () => {
	return gulp.src('src/client/style.css')
			.pipe(gulp.dest('dist/client/'));
});
gulp.task('client@css:watch', ['client@css'], () => {
	gulp.watch('src/client/style.css', ['client@css']);
});

gulp.task('client@ts', cb => {
	launchTscProcess('CLIENT', ['-p', './src/client'], cb);
});
gulp.task('client@ts:watch', cb => {
	launchTscProcess('CLIENT', ['-p', './src/client', '-w'], cb);
});

gulp.task('backend@ts', cb => {
	launchTscProcess('BACKEND', ['-p', './src/'], cb);
});
gulp.task('backend@ts:watch', cb => {
	launchTscProcess('BACKEND', ['-p', './src/', '-w'], cb);
});

gulp.task('sync', () => {
	const bs = browserSync.create();

	setTimeout(() => {
		bs.init({
			ui: false, // Not used
			online: false, // Not used, apparently this can shorten startup time.
			// ghostMode: false,
			open: false,
			localOnly: true,
			server: {
				baseDir: path.join(OUTPUT_DIR, './client/'),
				directory: false, // Not used
			},
			watchEvents: ["add", "change"],
			files: [
				ext('html'),
				ext('css'),
				ext('js'),
			],
		});

		function ext(extension: string) {
			return path.join(OUTPUT_DIR, './client/**/*.' + extension);
		}
	}, 5000);
});

gulp.task('default', cb => runSequence('clean', ['scaffolding', 'backend@ts', 'client@html', 'client@css', 'client@ts'], cb));
gulp.task('watch', cb => runSequence('clean', ['scaffolding', 'backend@ts:watch', 'client@html:watch', 'client@css:watch', 'client@ts:watch'], cb));
gulp.task('serve', ['watch', 'sync']);

function launchTscProcess(name: string, args: string[], cb: () => void) {
	const tscProcess = child_process.spawn('./node_modules/.bin/tsc', args);

	tscProcess.stdout.on('data', data => {
		console.log(chalk.green(`[${name}]`), String(data).trim());
	});
	tscProcess.stderr.on('data', data => {
		console.error(chalk.red(`[${name} ERROR]`), data);
	});

	tscProcess.on('close', () => {
		cb();
	});
}

function exists(itemPath: string): Promise<boolean> {
	return fsp.access(itemPath)
			.then(() => true)
			.catch(() => false);
}

