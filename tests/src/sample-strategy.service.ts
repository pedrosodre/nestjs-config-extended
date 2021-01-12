import { Injectable } from '@nestjs/common';
import { LoaderClass, TransformerClass, ValidatorClass } from '../../lib';

@Injectable()
export class SampleStrategyService
	implements LoaderClass, TransformerClass, ValidatorClass {
	load(): Record<string, any> {
		return { test: 'strategy-class' };
	}

	transform(variables: Record<string, any>): Record<string, any> {
		return variables;
	}

	validate(variables: Record<string, any>): boolean {
		return variables.test ? true : false;
	}
}
