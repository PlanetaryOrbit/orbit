import React, { FC, ReactNode, useEffect } from "react";
import { role } from "@/utils/database";
import Roles from "@/components/settings/permissions/roles";
import Departments from "@/components/settings/permissions/departments";
import Users from "@/components/settings/permissions/users";
import { Role } from "noblox.js";
import { Department } from "@/components/settings/permissions/departments";

type Props = {
	users: any[];
	roles: role[];
	departments: Department[];
	grouproles: Role[]
};

const Button: FC<Props> = (props) => {
	const [roles, setRoles] = React.useState<role[]>(props.roles);
	const [departments, setDepartments] = React.useState<Department[]>(props.departments);

	return (
		<div>
			<Users roles={roles} users={props.users} />
			<Roles setRoles={setRoles} roles={roles} grouproles={props.grouproles}  />
			<Departments setDepartments={setDepartments} departments={departments} />
		</div>
	);
};

export default Button;
