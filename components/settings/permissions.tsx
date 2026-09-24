import { Role } from 'noblox.js';
import React, { FC, ReactNode, useEffect } from 'react';

import Departments from '@/components/settings/permissions/departments';
import { Department } from '@/components/settings/permissions/departments';
import Roles from '@/components/settings/permissions/roles';
import Users from '@/components/settings/permissions/users';
import { role } from '@/utils/database';

type Props = {
  users: any[];
  roles: role[];
  departments: Department[];
  grouproles: Role[];
};

const Button: FC<Props> = (props) => {
  const [roles, setRoles] = React.useState<role[]>(props.roles);
  const [departments, setDepartments] = React.useState<Department[]>(props.departments);

  return (
    <div>
      <Users roles={roles} users={props.users} />
      <Roles setRoles={setRoles} roles={roles} grouproles={props.grouproles} />
      <Departments setDepartments={setDepartments} departments={departments} />
    </div>
  );
};

export default Button;
